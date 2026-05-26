"use client";

import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import {
  Repeat,
  Pencil,
  Trash2,
  Archive,
  Upload,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { IncomeStream, RecurringRevenue } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
import {
  deleteRecurring,
  importRecurringBulk,
  upsertRecurring,
  type ImportRecurringItem,
} from "@/app/(app)/income/recurring-actions";

export function RecurringRevenueList({
  items,
  streams,
}: {
  items: RecurringRevenue[];
  streams: IncomeStream[];
}) {
  const [editing, setEditing] = useState<RecurringRevenue | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const active = useMemo(
    () => items.filter((i) => !i.is_archived),
    [items]
  );
  const archived = useMemo(
    () => items.filter((i) => i.is_archived),
    [items]
  );

  const sorted = useMemo(
    () =>
      [...active].sort(
        (a, b) => (a.due_day ?? 99) - (b.due_day ?? 99)
      ),
    [active]
  );

  const total = active.reduce((a, i) => a + Number(i.amount), 0);

  const streamsById = useMemo(() => {
    const m = new Map<string, IncomeStream>();
    for (const s of streams) m.set(s.id, s);
    return m;
  }, [streams]);

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs flex items-start gap-2",
            banner.kind === "ok"
              ? "bg-[var(--teal-bg)] border-[color:var(--teal)]/30 text-[var(--teal-dark)]"
              : "bg-[var(--coral-bg)] border-[color:var(--coral)]/30 text-[var(--coral)]"
          )}
        >
          {banner.kind === "ok" ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <Card>
        <CardTitle
          right={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImport(true)}
              >
                <Upload size={11} /> Import CSV
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                <Plus size={11} /> Add
              </Button>
            </div>
          }
        >
          <span className="inline-flex items-center gap-2">
            <Repeat size={14} />
            Recurring revenue
          </span>
        </CardTitle>
        <p className="-mt-2 mb-3 text-[11px] text-[var(--muted-foreground)]">
          Per-client subscriptions, retainers, hosting, maintenance — each
          contract listed individually, due on its own day. These appear as
          income events in /cashflow on their due day.
        </p>

        {active.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring revenue yet"
            description="Add ongoing client subscriptions or retainers individually, or bulk-import a CSV with name, amount, and due day."
            action={
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowImport(true)}>
                  <Upload size={11} /> Import CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(true)}
                >
                  Add one manually
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <Tile
                label="Total recurring / mo"
                value={`${fmtCurrency(total)}/mo`}
                tone="primary"
                sub={`${active.length} active contract${active.length === 1 ? "" : "s"}`}
              />
              <Tile
                label="Annualized"
                value={fmtCurrency(total * 12)}
                sub="if all contracts hold"
              />
              <Tile
                label="Average per contract"
                value={fmtCurrency(active.length > 0 ? total / active.length : 0)}
                sub="across active contracts"
              />
            </div>

            <ul className="divide-y divide-[var(--border)]">
              {sorted.map((item) => (
                <RecurringRow
                  key={item.id}
                  item={item}
                  streamName={
                    item.stream_id
                      ? (streamsById.get(item.stream_id)?.name ?? null)
                      : null
                  }
                  onEdit={() => {
                    setEditing(item);
                    setShowForm(true);
                  }}
                  onBanner={setBanner}
                />
              ))}
            </ul>
          </>
        )}
      </Card>

      {archived.length > 0 && (
        <Card>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Archive size={14} className="text-[var(--muted-foreground)]" />
              Archived contracts ({archived.length})
            </span>
            <span className="text-[11px] text-[var(--teal)]">
              {showArchived ? "Hide" : "Show"}
            </span>
          </button>
          {showArchived && (
            <ul className="divide-y divide-[var(--border)] mt-3 opacity-70">
              {archived.map((item) => (
                <RecurringRow
                  key={item.id}
                  item={item}
                  streamName={
                    item.stream_id
                      ? (streamsById.get(item.stream_id)?.name ?? null)
                      : null
                  }
                  onEdit={() => {
                    setEditing(item);
                    setShowForm(true);
                  }}
                  onBanner={setBanner}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      {showForm && (
        <RecurringForm
          item={editing}
          streams={streams}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onBanner={setBanner}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onBanner={setBanner}
        />
      )}
    </div>
  );
}

function RecurringRow({
  item,
  streamName,
  onEdit,
  onBanner,
}: {
  item: RecurringRevenue;
  streamName: string | null;
  onEdit: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <li className="py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{item.name}</span>
          {item.category && (
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px]">
              {item.category}
            </span>
          )}
          {streamName && (
            <span className="rounded bg-[var(--blue-bg)] text-[var(--blue-fg)] px-1.5 py-0.5 text-[10px] font-medium">
              {streamName}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] flex items-center gap-2 flex-wrap">
          {item.client_name && <span>{item.client_name}</span>}
          {item.due_day && (
            <span>
              {item.client_name && "·"} Due day {item.due_day}
            </span>
          )}
          {item.notes && (
            <span className="italic truncate max-w-xs">{item.notes}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm font-medium">
          {fmtCurrency(Number(item.amount))}
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)]">/ mo</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil size={12} />
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Delete "${item.name}"?`)) return;
            startTransition(async () => {
              try {
                await deleteRecurring(item.id);
              } catch (e) {
                onBanner({
                  kind: "err",
                  text: `Couldn't delete: ${(e as Error).message}`,
                });
              }
            });
          }}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </li>
  );
}

function RecurringForm({
  item,
  streams,
  onClose,
  onBanner,
}: {
  item: RecurringRevenue | null;
  streams: IncomeStream[];
  onClose: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-4">
          {item ? "Edit recurring contract" : "Add recurring contract"}
        </h3>
        <form
          action={(fd) => {
            if (item) fd.set("id", item.id);
            startTransition(async () => {
              try {
                await upsertRecurring(fd);
                onBanner({ kind: "ok", text: "Saved." });
                onClose();
              } catch (e) {
                onBanner({
                  kind: "err",
                  text: `Couldn't save: ${(e as Error).message}`,
                });
              }
            });
          }}
          className="space-y-3"
        >
          <Field label="Name">
            <input
              name="name"
              required
              defaultValue={item?.name ?? ""}
              placeholder="Acme Hosting, Maintenance retainer…"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Amount / month ($)">
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                required
                defaultValue={item?.amount ?? ""}
              />
            </Field>
            <Field label="Due day (1–31)">
              <input
                type="number"
                name="due_day"
                min="1"
                max="31"
                step="1"
                defaultValue={item?.due_day ?? ""}
                placeholder="e.g. 15"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category">
              <input
                name="category"
                defaultValue={item?.category ?? ""}
                placeholder="hosting, maintenance, retainer…"
              />
            </Field>
            <Field label="Client (optional)">
              <input
                name="client_name"
                defaultValue={item?.client_name ?? ""}
                placeholder="Acme Corp"
              />
            </Field>
          </div>
          {streams.length > 0 && (
            <Field label="Linked income stream (optional)">
              <select
                name="stream_id"
                defaultValue={item?.stream_id ?? "none"}
              >
                <option value="none">— none —</option>
                {streams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Started (optional)">
              <input
                type="date"
                name="start_month"
                defaultValue={item?.start_month ?? ""}
              />
            </Field>
            <Field label="Ends (optional)">
              <input
                type="date"
                name="end_month"
                defaultValue={item?.end_month ?? ""}
              />
            </Field>
          </div>
          <Field label="Notes">
            <input name="notes" defaultValue={item?.notes ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="is_archived"
              defaultChecked={item?.is_archived ?? false}
            />
            <span>Archived (excluded from cashflow + totals)</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {item ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportModal({
  onClose,
  onBanner,
}: {
  onClose: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [rows, setRows] = useState<ImportRecurringItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const detectColumns = (headers: string[]) => {
    const norm = headers.map((h) => h.toLowerCase().trim());
    const idx: Record<string, number> = {};
    norm.forEach((h, i) => {
      if (idx.name === undefined && /(name|description|service|title)/.test(h))
        idx.name = i;
      if (idx.amount === undefined && /(amount|price|cost|fee|monthly)/.test(h))
        idx.amount = i;
      if (idx.due_day === undefined && /(day|date|due|payment)/.test(h))
        idx.due_day = i;
      if (idx.category === undefined && /(category|type|kind)/.test(h))
        idx.category = i;
      if (idx.client_name === undefined && /(client|customer|company)/.test(h))
        idx.client_name = i;
      if (idx.notes === undefined && /(note|comment)/.test(h)) idx.notes = i;
    });
    if (idx.name === undefined) idx.name = 0;
    if (idx.amount === undefined) idx.amount = 1;
    return idx;
  };

  const handleFile = (file: File) => {
    setError(null);
    Papa.parse<string[]>(file, {
      complete: (results) => {
        const filtered = results.data.filter(
          (r) => Array.isArray(r) && r.some((c) => c)
        );
        if (filtered.length < 2) {
          setError("File needs a header row and at least one data row.");
          return;
        }
        parseRows(filtered);
      },
      error: (e) => setError(String(e.message ?? e)),
    });
  };

  const handlePaste = (text: string) => {
    setError(null);
    const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
    if (!parsed.data.length || parsed.data.length < 2) {
      setError("Paste needs a header row and at least one data row.");
      return;
    }
    parseRows(parsed.data);
  };

  const parseRows = (data: string[][]) => {
    const headers = data[0];
    const idx = detectColumns(headers);
    const items: ImportRecurringItem[] = [];
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      const name = String(r[idx.name] ?? "").trim();
      const amtStr = String(r[idx.amount] ?? "").replace(/[$,\s]/g, "");
      const amount = parseFloat(amtStr);
      if (!name || !Number.isFinite(amount) || amount <= 0) continue;
      const dueStr = String(r[idx.due_day] ?? "").trim();
      let due_day: number | undefined;
      const dueNum = parseInt(dueStr, 10);
      if (Number.isFinite(dueNum) && dueNum >= 1 && dueNum <= 31)
        due_day = dueNum;
      items.push({
        name,
        amount,
        due_day,
        category:
          idx.category !== undefined
            ? String(r[idx.category] ?? "").trim() || undefined
            : undefined,
        client_name:
          idx.client_name !== undefined
            ? String(r[idx.client_name] ?? "").trim() || undefined
            : undefined,
        notes:
          idx.notes !== undefined
            ? String(r[idx.notes] ?? "").trim() || undefined
            : undefined,
      });
    }
    if (items.length === 0) {
      setError("Couldn't find any valid rows. Check name + amount columns.");
      return;
    }
    setRows(items);
  };

  const doImport = () => {
    startTransition(async () => {
      try {
        const res = await importRecurringBulk(rows);
        onBanner({
          kind: "ok",
          text: `Imported ${res.inserted} recurring contracts.`,
        });
        onClose();
      } catch (e) {
        onBanner({
          kind: "err",
          text: `Import failed: ${(e as Error).message}`,
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-2xl rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-2">
          Import recurring contracts
        </h3>
        <p className="text-[11px] text-[var(--muted-foreground)] mb-4">
          Upload a CSV or paste rows. Required columns:{" "}
          <span className="font-mono">name</span>,{" "}
          <span className="font-mono">amount</span>. Optional:{" "}
          <span className="font-mono">due_day</span> (1–31),{" "}
          <span className="font-mono">category</span>,{" "}
          <span className="font-mono">client</span>,{" "}
          <span className="font-mono">notes</span>. Header names are detected
          loosely (e.g. "Service", "Price", "Day of Month" all work).
        </p>

        {error && (
          <div className="mb-3 rounded-md border border-[color:var(--coral)]/30 bg-[var(--coral-bg)] px-3 py-2 text-xs text-[var(--coral)]">
            {error}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="space-y-3">
            <label className="block">
              <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
                Upload CSV
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="text-[10px] text-[var(--muted-foreground)] text-center">
              — or —
            </div>
            <label className="block">
              <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
                Paste rows (comma or tab separated)
              </div>
              <textarea
                rows={6}
                placeholder={`name,amount,due_day,category\nAcme Hosting,99,15,hosting\nWidget Maintenance,250,1,maintenance`}
                className="w-full font-mono text-xs"
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text) handlePaste(text);
                }}
              />
            </label>
            <div className="text-[10px] text-[var(--muted-foreground)]">
              The textarea triggers parsing on paste — drop your rows in and
              you'll see a preview.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-[var(--border)] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium">Name</th>
                    <th className="text-left px-2 py-1.5 font-medium">Client</th>
                    <th className="text-left px-2 py-1.5 font-medium">Category</th>
                    <th className="text-right px-2 py-1.5 font-medium">Amount</th>
                    <th className="text-right px-2 py-1.5 font-medium">Day</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="px-2 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5 text-[var(--muted-foreground)]">
                        {r.client_name ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--muted-foreground)]">
                        {r.category ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {fmtCurrency(r.amount)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {r.due_day ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[var(--muted)]">
                  <tr>
                    <td
                      className="px-2 py-1.5 font-medium"
                      colSpan={3}
                    >
                      Total
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium">
                      {fmtCurrency(rows.reduce((a, r) => a + r.amount, 0))}/mo
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRows([]);
                  setError(null);
                }}
              >
                Start over
              </Button>
              <Button onClick={doImport} disabled={isPending}>
                Import {rows.length} contract{rows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-md px-3 py-2",
        tone === "primary" ? "bg-[var(--teal-bg)]" : "bg-[var(--muted)]"
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-mono text-sm font-medium",
          tone === "primary" && "text-[var(--teal-dark)]"
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}
