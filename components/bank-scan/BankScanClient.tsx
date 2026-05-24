"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import {
  Upload,
  Scissors,
  HelpCircle,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, fmtCurrency } from "@/lib/utils";
import { addExpense } from "@/app/(app)/expenses/actions";

type Txn = { raw: string; desc: string; amt: number; date?: string };

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

function detectColumns(headers: string[]): {
  amtIdx: number;
  descIdx: number;
  dateIdx: number;
} {
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

export function BankScanClient() {
  const [filename, setFilename] = useState<string | null>(null);
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    setFilename(file.name);
    Papa.parse<string[]>(file, {
      complete: (results) => {
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
            raw: String(r[descIdx] ?? ""),
            desc: String(r[descIdx] ?? "").toLowerCase(),
            amt: Math.abs(amt),
            date: r[dateIdx] ? String(r[dateIdx]) : undefined,
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
        setDateRange(
          dates.length ? [dates[0], dates[dates.length - 1]] : null
        );
        setTxns(parsed);
      },
      error: (e) => setError(String(e.message ?? e)),
    });
  };

  const total = txns?.reduce((a, t) => a + t.amt, 0) ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Upload Bank Statement CSV</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)] mb-3">
          Export transactions from your bank as CSV. Parsing happens entirely
          in your browser — nothing is sent to a server.
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
          }}
        />
        {filename && (
          <div className="mt-3 text-[11px] text-[var(--muted-foreground)]">
            Parsed: <span className="font-mono">{filename}</span>
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-md border border-[color:var(--coral)]/30 bg-[var(--coral-bg)] px-3 py-2 text-xs text-[var(--coral)]">
            {error}
          </div>
        )}
      </Card>

      {txns && txns.length > 0 && (
        <SpendingResults
          txns={txns}
          total={total}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}

function SpendingResults({
  txns,
  total,
  dateRange,
}: {
  txns: Txn[];
  total: number;
  dateRange: [string, string] | null;
}) {
  const { grouped, uncat } = categorize(txns);
  const sorted = Object.entries(grouped).sort(
    (a, b) =>
      b[1].reduce((s, t) => s + t.amt, 0) -
      a[1].reduce((s, t) => s + t.amt, 0)
  );
  const subs = grouped["Subscriptions"];
  const subsTotal = subs?.reduce((a, t) => a + t.amt, 0) ?? 0;

  return (
    <Card>
      <CardTitle>Spending Analysis</CardTitle>
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
          <CategorySection key={cat} category={cat} items={items} />
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
}: {
  category: string;
  items: Txn[];
}) {
  const [open, setOpen] = useState(true);
  const total = items.reduce((a, t) => a + t.amt, 0);
  const top = items.sort((a, b) => b.amt - a.amt).slice(0, 5);
  const rest = items.length - top.length;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border-b border-[var(--border)] py-2 text-sm hover:bg-[var(--muted)] px-1"
      >
        <span className="flex items-center gap-2 font-medium">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {category}{" "}
          <span className="font-normal text-[var(--muted-foreground)] text-[11px]">
            ({items.length})
          </span>
        </span>
        <span className="font-mono">{fmtCurrency(total)}</span>
      </button>
      {open && (
        <div className="pl-5 pt-1 space-y-0.5">
          {top.map((t, i) => (
            <TxnRow key={i} txn={t} category={category} />
          ))}
          {rest > 0 && (
            <div className="text-[10px] text-[var(--muted-foreground)] py-1 px-2">
              +{rest} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TxnRow({ txn, category }: { txn: Txn; category: string }) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const addAsExpense = () => {
    const fd = new FormData();
    fd.set("name", txn.raw.trim().slice(0, 80) || category);
    fd.set("type", "personal");
    fd.set("amount", String(txn.amt));
    fd.set("category", PERSONAL_CATEGORY_MAP[category] ?? "Other");
    startTransition(async () => {
      await addExpense(fd);
      setAdded(true);
    });
  };

  return (
    <div className="flex items-center justify-between py-0.5 text-[11px] gap-2">
      <span className="truncate text-[var(--muted-foreground)] max-w-[60%]">
        {txn.raw}
      </span>
      <span className="font-mono">{fmtCurrency(txn.amt)}</span>
      <button
        onClick={addAsExpense}
        disabled={isPending || added}
        className={cn(
          "shrink-0 inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] transition-colors",
          added
            ? "text-[var(--teal)] border-[color:var(--teal)]/30 bg-[var(--teal-bg)]"
            : "hover:bg-[var(--muted)]"
        )}
        aria-label="Add to expenses"
      >
        <Plus size={9} />
        {added ? "Added" : "Add to Expenses"}
      </button>
    </div>
  );
}
