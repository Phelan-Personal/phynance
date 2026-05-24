"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import {
  Upload,
  Scissors,
  HelpCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, fmtCurrency } from "@/lib/utils";
import { toIsoDate, todayIso } from "@/lib/dates";
import { addExpensesBulk } from "@/app/(app)/expenses/actions";
import {
  addTransactionsFromScan,
  deleteTransaction,
  saveBankScan,
  type TxnImportItem,
} from "@/app/(app)/bank-scan/actions";
import type { ExpenseTransaction } from "@/types";

type Txn = {
  id: string;
  raw: string;
  desc: string;
  amt: number;
  date?: string; // ISO YYYY-MM-DD
};

type ParsedScan = {
  filename: string | null;
  parsedAt: number;
  txns: Txn[];
  dateRange: [string, string] | null;
};

type DefaultType = "personal" | "business";

const STORAGE_KEY = "phynance.bank_scan.v2";

const CATEGORIES: Record<string, string[]> = {
  Subscriptions: [
    "netflix", "spotify", "hulu", "disney+", "amazon prime", "adobe", "slack",
    "shopify", "dropbox", "figma", "notion", "github", "zoom", "mailchimp",
    "klaviyo", "hubspot", "quickbooks", "xero", "asana", "monday.com", "airtable",
  ],
  "Food & Dining": [
    "restaurant", "cafe", "grubhub", "doordash", "uber eats", "instacart",
    "chipotle", "mcdonald", "taco bell", "subway", "panera", "chick-fil",
    "wendy", "dine", "eatery",
  ],
  Coffee: ["starbucks", "dutch bros", "peet", "coffee bean", "caffeine"],
  "Gas & Auto": [
    "shell", "chevron", "arco", " 76", "exxon", "bp oil", "texaco",
    "autozone", "jiffy lube", "valvoline", "fuel",
  ],
  Rideshare: ["uber", "lyft", "waymo"],
  Groceries: [
    "kroger", "safeway", "vons", "ralphs", "walmart", "target", "costco",
    "whole foods", "trader joe", "sprouts", "aldi", "publix",
  ],
  Insurance: [
    "insurance", "geico", "allstate", "state farm", "progressive",
    "travelers", "aaa",
  ],
  "Phone/Internet": [
    "at&t", "verizon", "t-mobile", "sprint", "mint mobile", "xfinity",
    "spectrum", "cox", "comcast",
  ],
  Entertainment: [
    "ticketmaster", "live nation", "amc", "regal", "cinemark", "steam",
    "playstation", "xbox",
  ],
  Shopping: ["amazon", "etsy", "ebay", "best buy", "apple store"],
  "Gym/Health": [
    "planet fitness", "equinox", "crunch", "24 hour fitness", "la fitness",
    "ymca", "gym",
  ],
};

const PERSONAL_CATEGORY_MAP: Record<string, string> = {
  Subscriptions: "Subscriptions",
  "Food & Dining": "Food & Dining",
  Coffee: "Food & Dining",
  "Gas & Auto": "Transportation",
  Rideshare: "Transportation",
  Groceries: "Food & Dining",
  Insurance: "Insurance",
  "Phone/Internet": "Utilities",
  Entertainment: "Entertainment",
  Shopping: "Other",
  "Gym/Health": "Healthcare",
};

const BUSINESS_CATEGORY_MAP: Record<string, string> = {
  Subscriptions: "Subscriptions",
  Insurance: "Insurance",
  "Phone/Internet": "Software/Tools",
};

function categoryFor(scanCat: string, t: DefaultType): string {
  if (t === "business") return BUSINESS_CATEGORY_MAP[scanCat] ?? "Other";
  return PERSONAL_CATEGORY_MAP[scanCat] ?? "Other";
}

function categorize(txns: Txn[]) {
  const grouped: Record<string, Txn[]> = {};
  const uncat: Txn[] = [];
  for (const t of txns) {
    let found = false;
    for (const [cat, kws] of Object.entries(CATEGORIES)) {
      if (kws.some((k) => t.desc.includes(k))) {
        (grouped[cat] = grouped[cat] ?? []).push(t);
        found = true;
        break;
      }
    }
    if (!found) uncat.push(t);
  }
  return { grouped, uncat };
}

function detectColumns(headers: string[]) {
  const norm = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  let amtIdx = -1;
  let descIdx = -1;
  let dateIdx = -1;
  norm.forEach((h, i) => {
    if (amtIdx === -1 && /(amount|debit|credit|transaction|^amt$)/.test(h))
      amtIdx = i;
    if (descIdx === -1 && /(description|memo|name|payee|merchant|details)/.test(h))
      descIdx = i;
    if (dateIdx === -1 && /(date|posted|transactiondate)/.test(h)) dateIdx = i;
  });
  return {
    amtIdx: amtIdx === -1 ? 1 : amtIdx,
    descIdx: descIdx === -1 ? Math.min(headers.length - 1, 2) : descIdx,
    dateIdx: dateIdx === -1 ? 0 : dateIdx,
  };
}

function aggregateByMerchant(txns: Txn[]) {
  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const t of txns) {
    const key = t.raw.trim().slice(0, 80).toLowerCase() || "unknown";
    const cur = map.get(key) ?? { name: t.raw.trim().slice(0, 80), total: 0, count: 0 };
    cur.total += t.amt;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function BankScanClient({
  initialRecentTransactions,
}: {
  initialRecentTransactions: ExpenseTransaction[];
}) {
  const [scan, setScan] = useState<ParsedScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [defaultType, setDefaultType] = useState<DefaultType>("personal");
  const [topBanner, setTopBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ParsedScan;
        if (parsed && Array.isArray(parsed.txns) && parsed.txns.length) {
          setScan(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!scan) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(scan));
    } catch {
      // ignore
    }
  }, [scan]);

  const handleFile = (file: File) => {
    setError(null);
    setTopBanner(null);
    Papa.parse<string[]>(file, {
      complete: async (results) => {
        const rows = results.data.filter(
          (r) => Array.isArray(r) && r.length > 0 && r.some((c) => c)
        );
        if (rows.length < 2) {
          setError("File looks empty or has no transactions.");
          return;
        }
        const headers = rows[0];
        const { amtIdx, descIdx, dateIdx } = detectColumns(headers);

        const parsed: Txn[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (r.length <= Math.max(amtIdx, descIdx)) continue;
          const raw = String(r[amtIdx] ?? "").replace(/[$,\s]/g, "");
          const amt = parseFloat(raw);
          if (!Number.isFinite(amt) || amt === 0) continue;
          parsed.push({
            id: `${i}-${Math.random().toString(36).slice(2, 8)}`,
            raw: String(r[descIdx] ?? ""),
            desc: String(r[descIdx] ?? "").toLowerCase(),
            amt: Math.abs(amt),
            date: r[dateIdx] ? toIsoDate(String(r[dateIdx])) : undefined,
          });
        }
        if (parsed.length === 0) {
          setError(
            "Couldn't find any transactions. The CSV may not match the expected format."
          );
          return;
        }

        const dates = parsed
          .map((t) => t.date)
          .filter(Boolean)
          .sort() as string[];

        const next: ParsedScan = {
          filename: file.name,
          parsedAt: Date.now(),
          txns: parsed,
          dateRange: dates.length
            ? [dates[0], dates[dates.length - 1]]
            : null,
        };
        setScan(next);
        setAddedIds(new Set());

        try {
          const { grouped } = categorize(parsed);
          const summary = Object.entries(grouped).map(([category, items]) => ({
            category,
            total: items.reduce((a, t) => a + t.amt, 0),
            count: items.length,
          }));
          await saveBankScan({
            filename: file.name,
            totalTransactions: parsed.length,
            totalOutflow: parsed.reduce((a, t) => a + t.amt, 0),
            summary,
          });
        } catch (e) {
          console.warn("Could not save scan summary:", e);
        }
      },
      error: (e) => setError(String(e.message ?? e)),
    });
  };

  const markAdded = (ids: string[]) => {
    setAddedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => next.add(i));
      return next;
    });
  };

  const clearScan = () => {
    setScan(null);
    setAddedIds(new Set());
    setTopBanner(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const total = scan?.txns.reduce((a, t) => a + t.amt, 0) ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          right={
            scan && (
              <Button variant="outline" size="sm" onClick={clearScan}>
                Clear scan
              </Button>
            )
          }
        >
          Upload Bank Statement CSV
        </CardTitle>
        <p className="text-xs text-[var(--muted-foreground)] mb-3">
          Export transactions from your bank as CSV. Parsing happens entirely
          in your browser; only the resulting transactions and a summary are
          saved to your account.
        </p>
        <label
          htmlFor="csv"
          className="flex flex-col items-center justify-center cursor-pointer rounded-lg border border-dashed border-[var(--border)] py-8 hover:bg-[var(--muted)] transition-colors"
        >
          <Upload size={22} className="text-[var(--muted-foreground)]" />
          <div className="mt-2 text-sm">Click to upload .csv file</div>
          <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">
            Chase · Bank of America · Wells Fargo · generic
          </div>
        </label>
        <input
          type="file"
          id="csv"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {scan?.filename && (
          <div className="mt-3 text-[11px] text-[var(--muted-foreground)]">
            Loaded: <span className="font-mono">{scan.filename}</span>
            {" — "}
            <span>{new Date(scan.parsedAt).toLocaleString()}</span>
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-md border border-[color:var(--coral)]/30 bg-[var(--coral-bg)] px-3 py-2 text-xs text-[var(--coral)]">
            {error}
          </div>
        )}
      </Card>

      {topBanner && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs flex items-start gap-2",
            topBanner.kind === "ok"
              ? "bg-[var(--teal-bg)] border-[color:var(--teal)]/30 text-[var(--teal-dark)]"
              : "bg-[var(--coral-bg)] border-[color:var(--coral)]/30 text-[var(--coral)]"
          )}
        >
          {topBanner.kind === "ok" ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
          )}
          <span>{topBanner.text}</span>
        </div>
      )}

      {scan && scan.txns.length > 0 && (
        <SpendingResults
          txns={scan.txns}
          total={total}
          dateRange={scan.dateRange}
          addedIds={addedIds}
          defaultType={defaultType}
          setDefaultType={setDefaultType}
          onAdded={markAdded}
          onBanner={setTopBanner}
        />
      )}

      <RecentImports transactions={initialRecentTransactions} />
    </div>
  );
}

function SpendingResults({
  txns,
  total,
  dateRange,
  addedIds,
  defaultType,
  setDefaultType,
  onAdded,
  onBanner,
}: {
  txns: Txn[];
  total: number;
  dateRange: [string, string] | null;
  addedIds: Set<string>;
  defaultType: DefaultType;
  setDefaultType: (t: DefaultType) => void;
  onAdded: (ids: string[]) => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const { grouped, uncat } = useMemo(() => categorize(txns), [txns]);
  const sorted = useMemo(
    () =>
      Object.entries(grouped).sort(
        (a, b) =>
          b[1].reduce((s, t) => s + t.amt, 0) -
          a[1].reduce((s, t) => s + t.amt, 0)
      ),
    [grouped]
  );
  const subs = grouped["Subscriptions"];
  const subsTotal = subs?.reduce((a, t) => a + t.amt, 0) ?? 0;

  return (
    <Card>
      <CardTitle
        right={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--muted-foreground)]">
              Add as:
            </span>
            <div className="flex rounded-md border border-[var(--border)] p-0.5 text-xs">
              {(["personal", "business"] as DefaultType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDefaultType(t)}
                  className={cn(
                    "px-2 py-0.5 rounded-sm capitalize transition-colors",
                    defaultType === t
                      ? "bg-[var(--muted)] font-medium"
                      : "text-[var(--muted-foreground)]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        }
      >
        Spending Analysis
      </CardTitle>
      <div className="text-xs text-[var(--muted-foreground)] mb-3">
        {txns.length} transactions · {fmtCurrency(total)} total outflow
        {dateRange && (
          <>
            {" "}· {dateRange[0]} → {dateRange[1]}
          </>
        )}
      </div>

      {subs && subsTotal > 0 && (
        <div className="mb-4 rounded-md border border-[color:var(--amber)]/30 bg-[var(--amber-bg)] px-3 py-2 text-xs text-[var(--amber)] flex items-start gap-2">
          <Scissors size={14} className="mt-0.5" />
          <span>
            <strong>{fmtCurrency(subsTotal)} in subscriptions</strong> across{" "}
            {subs.length} charges — audit anything unused to redirect toward debt.
          </span>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(([cat, items]) => (
          <CategorySection
            key={cat}
            category={cat}
            items={items}
            addedIds={addedIds}
            defaultType={defaultType}
            onAdded={onAdded}
            onBanner={onBanner}
          />
        ))}
      </div>

      {uncat.length > 0 && (
        <div className="mt-4 rounded-md bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)] flex items-start gap-2">
          <HelpCircle size={14} className="mt-0.5" />
          {uncat.length} uncategorized transactions totaling{" "}
          {fmtCurrency(uncat.reduce((a, t) => a + t.amt, 0))}
        </div>
      )}
    </Card>
  );
}

function CategorySection({
  category,
  items,
  addedIds,
  defaultType,
  onAdded,
  onBanner,
}: {
  category: string;
  items: Txn[];
  addedIds: Set<string>;
  defaultType: DefaultType;
  onAdded: (ids: string[]) => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const total = items.reduce((a, t) => a + t.amt, 0);
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.amt - a.amt),
    [items]
  );
  const visible = showAll ? sortedItems : sortedItems.slice(0, 5);
  const rest = sortedItems.length - visible.length;
  const merchants = useMemo(() => aggregateByMerchant(items), [items]);
  const allAdded = items.every((t) => addedIds.has(t.id));
  const resolvedCategory = categoryFor(category, defaultType);

  const addAllAsTransactions = () => {
    const toAdd = items.filter((t) => !addedIds.has(t.id));
    if (!toAdd.length) return;
    onBanner(null);
    startTransition(async () => {
      try {
        const payload: TxnImportItem[] = toAdd.map((t) => ({
          name: t.raw.trim().slice(0, 80) || category,
          type: defaultType,
          amount: t.amt,
          category: resolvedCategory,
          occurred_on: t.date ?? todayIso(),
        }));
        const res = await addTransactionsFromScan(payload);
        onAdded(toAdd.map((t) => t.id));
        onBanner({
          kind: "ok",
          text: `Added ${res.inserted} ${category} transactions as ${defaultType} expenses.`,
        });
      } catch (e) {
        onBanner({
          kind: "err",
          text: `Could not add transactions: ${(e as Error).message}`,
        });
      }
    });
  };

  const addAsRecurringMerchants = () => {
    onBanner(null);
    startTransition(async () => {
      try {
        const res = await addExpensesBulk(
          merchants.map((m) => ({
            name: m.name,
            type: defaultType,
            amount: m.total / Math.max(1, m.count),
            category: resolvedCategory,
            is_recurring: true,
          }))
        );
        onBanner({
          kind: "ok",
          text: `Added ${res.inserted} ${category} merchants as recurring ${defaultType} expenses.`,
        });
      } catch (e) {
        onBanner({
          kind: "err",
          text: `Could not add recurring: ${(e as Error).message}`,
        });
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--border)] py-2 text-sm">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {category}{" "}
          <span className="font-normal text-[var(--muted-foreground)] text-[11px]">
            ({items.length})
          </span>
        </button>
        <span className="font-mono">{fmtCurrency(total)}</span>
      </div>
      {open && (
        <div className="pl-5 pt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={addAllAsTransactions}
              disabled={isPending || allAdded}
            >
              {allAdded
                ? "All added"
                : `Add ${items.length} dated transactions`}
            </Button>
            {category === "Subscriptions" && (
              <Button
                size="sm"
                variant="outline"
                onClick={addAsRecurringMerchants}
                disabled={isPending}
              >
                Also add {merchants.length} merchants as recurring
              </Button>
            )}
          </div>
          <div className="space-y-0.5">
            {visible.map((t) => (
              <TxnRow
                key={t.id}
                txn={t}
                category={category}
                resolvedCategory={resolvedCategory}
                defaultType={defaultType}
                added={addedIds.has(t.id)}
                onAdded={(id) => onAdded([id])}
                onBanner={onBanner}
              />
            ))}
            {rest > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="text-[11px] text-[var(--teal)] hover:underline py-1 px-2"
              >
                +{rest} more — show all
              </button>
            )}
            {showAll && sortedItems.length > 5 && (
              <button
                onClick={() => setShowAll(false)}
                className="text-[11px] text-[var(--muted-foreground)] hover:underline py-1 px-2"
              >
                Collapse
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TxnRow({
  txn,
  category,
  resolvedCategory,
  defaultType,
  added,
  onAdded,
  onBanner,
}: {
  txn: Txn;
  category: string;
  resolvedCategory: string;
  defaultType: DefaultType;
  added: boolean;
  onAdded: (id: string) => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const addAsTransaction = () => {
    onBanner(null);
    startTransition(async () => {
      try {
        await addTransactionsFromScan([
          {
            name: txn.raw.trim().slice(0, 80) || category,
            type: defaultType,
            amount: txn.amt,
            category: resolvedCategory,
            occurred_on: txn.date ?? todayIso(),
          },
        ]);
        onAdded(txn.id);
      } catch (e) {
        onBanner({
          kind: "err",
          text: `Could not add transaction: ${(e as Error).message}`,
        });
      }
    });
  };

  return (
    <div className="flex items-center justify-between py-0.5 text-[11px] gap-2">
      <span className="truncate text-[var(--muted-foreground)] max-w-[55%]">
        {txn.raw}
      </span>
      {txn.date && (
        <span className="text-[10px] text-[var(--muted-foreground)] font-mono shrink-0">
          {txn.date.slice(5)}
        </span>
      )}
      <span className="font-mono">{fmtCurrency(txn.amt)}</span>
      <button
        onClick={addAsTransaction}
        disabled={isPending || added}
        className={cn(
          "shrink-0 inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] transition-colors",
          added
            ? "text-[var(--teal)] border-[color:var(--teal)]/30 bg-[var(--teal-bg)]"
            : "hover:bg-[var(--muted)]"
        )}
        aria-label="Add transaction"
      >
        <Plus size={9} />
        {added ? "Added" : "Add"}
      </button>
    </div>
  );
}

function RecentImports({
  transactions,
}: {
  transactions: ExpenseTransaction[];
}) {
  if (!transactions.length) return null;

  return (
    <Card>
      <CardTitle>Recent Transactions</CardTitle>
      <p className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
        The last {transactions.length} dated transactions — manual and
        bank-scan imports.
      </p>
      <ul className="divide-y divide-[var(--border)]">
        {transactions.map((t) => (
          <RecentRow key={t.id} txn={t} />
        ))}
      </ul>
    </Card>
  );
}

function RecentRow({ txn }: { txn: ExpenseTransaction }) {
  const [isPending, startTransition] = useTransition();
  return (
    <li className="py-2 flex items-center gap-3 text-xs">
      <span className="font-mono text-[var(--muted-foreground)] shrink-0 w-20">
        {txn.occurred_on}
      </span>
      <span className="flex-1 min-w-0 truncate">{txn.name}</span>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] capitalize",
          txn.type === "business"
            ? "bg-[var(--blue-bg)] text-[var(--blue-fg)]"
            : "bg-[var(--purple-bg)] text-[var(--purple-fg)]"
        )}
      >
        {txn.type}
      </span>
      <span className="font-mono shrink-0 w-20 text-right">
        {fmtCurrency(Number(txn.amount))}
      </span>
      <button
        onClick={() => {
          if (!confirm(`Delete this transaction?`)) return;
          startTransition(async () => {
            await deleteTransaction(txn.id);
          });
        }}
        disabled={isPending}
        className="shrink-0 rounded border border-[var(--border)] text-[var(--coral)] px-1.5 py-0.5 hover:bg-[var(--coral-bg)]"
        aria-label="Delete transaction"
      >
        <Trash2 size={11} />
      </button>
    </li>
  );
}
