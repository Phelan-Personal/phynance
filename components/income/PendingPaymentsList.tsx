"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ClipboardList,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import type { IncomeStream, PendingPayment } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
import { todayIso } from "@/lib/dates";
import {
  deletePendingPayment,
  markPaymentReceived,
  markPaymentUnreceived,
  upsertPendingPayment,
} from "@/app/(app)/income/pending-actions";

function fmtDateLabel(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function PendingPaymentsList({
  payments,
  streams,
}: {
  payments: PendingPayment[];
  streams: IncomeStream[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PendingPayment | null>(null);
  const [showReceived, setShowReceived] = useState(false);
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const today = todayIso();
  const streamsById = useMemo(() => {
    const m = new Map<string, IncomeStream>();
    for (const s of streams) m.set(s.id, s);
    return m;
  }, [streams]);

  const pending = useMemo(
    () => payments.filter((p) => !p.received_on),
    [payments]
  );
  const received = useMemo(
    () =>
      payments
        .filter((p) => p.received_on)
        .sort((a, b) =>
          (b.received_on ?? "").localeCompare(a.received_on ?? "")
        ),
    [payments]
  );

  const sortedPending = useMemo(
    () =>
      [...pending].sort((a, b) => {
        const ae = a.expected_on ?? "9999-12-31";
        const be = b.expected_on ?? "9999-12-31";
        return ae.localeCompare(be);
      }),
    [pending]
  );

  const totalOutstanding = pending.reduce((a, p) => a + Number(p.amount), 0);
  const totalOverdue = pending
    .filter((p) => p.expected_on && p.expected_on < today)
    .reduce((a, p) => a + Number(p.amount), 0);

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
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              Add pending payment
            </Button>
          }
        >
          <span className="inline-flex items-center gap-2">
            <ClipboardList size={14} />
            Pending payments (A/R)
          </span>
        </CardTitle>

        {pending.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No outstanding balances"
            description="Log final invoices or anything a client still owes you. Pending amounts flow into /cashflow on the expected date."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <Tile
                label="Total outstanding"
                value={fmtCurrency(totalOutstanding)}
                sub={`${pending.length} pending`}
              />
              {totalOverdue > 0 ? (
                <Tile
                  label="Of which overdue"
                  value={fmtCurrency(totalOverdue)}
                  tone="bad"
                  sub="expected date already passed"
                />
              ) : (
                <Tile
                  label="On schedule"
                  value="All pending payments"
                  tone="good"
                  sub="nothing overdue"
                />
              )}
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {sortedPending.map((p) => (
                <PendingRow
                  key={p.id}
                  payment={p}
                  streamName={p.stream_id ? (streamsById.get(p.stream_id)?.name ?? null) : null}
                  today={today}
                  onEdit={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                  onBanner={setBanner}
                />
              ))}
            </ul>
          </>
        )}
      </Card>

      {received.length > 0 && (
        <Card>
          <button
            onClick={() => setShowReceived((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 size={14} className="text-[var(--teal)]" />
              Received ({received.length})
              <span className="text-[11px] text-[var(--muted-foreground)] font-normal">
                — already collected
              </span>
            </span>
            <span className="text-[11px] text-[var(--teal)]">
              {showReceived ? "Hide" : "Show"}
            </span>
          </button>
          {showReceived && (
            <ul className="divide-y divide-[var(--border)] mt-3">
              {received.map((p) => (
                <ReceivedRow
                  key={p.id}
                  payment={p}
                  streamName={p.stream_id ? (streamsById.get(p.stream_id)?.name ?? null) : null}
                  onBanner={setBanner}
                  onEdit={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      {showForm && (
        <PendingPaymentForm
          payment={editing}
          streams={streams}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onBanner={setBanner}
        />
      )}
    </div>
  );
}

function PendingRow({
  payment,
  streamName,
  today,
  onEdit,
  onBanner,
}: {
  payment: PendingPayment;
  streamName: string | null;
  today: string;
  onEdit: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isOverdue = payment.expected_on
    ? payment.expected_on < today
    : false;
  const daysOut = payment.expected_on
    ? daysBetween(today, payment.expected_on)
    : null;

  return (
    <li className="py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {payment.client_name}
          </span>
          {streamName && (
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px]">
              {streamName}
            </span>
          )}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded bg-[var(--coral-bg)] text-[var(--coral)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              <AlertCircle size={10} /> Overdue
            </span>
          )}
        </div>
        {payment.description && (
          <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] truncate">
            {payment.description}
          </div>
        )}
        <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
          {payment.expected_on ? (
            <>
              Expected{" "}
              <span className="font-mono">
                {fmtDateLabel(payment.expected_on)}
              </span>
              {daysOut !== null && (
                <span
                  className={cn(
                    "ml-1.5",
                    daysOut < 0
                      ? "text-[var(--coral)]"
                      : daysOut <= 7
                        ? "text-[var(--amber)]"
                        : ""
                  )}
                >
                  ({daysOut < 0 ? `${Math.abs(daysOut)} days late` : `in ${daysOut} days`})
                </span>
              )}
            </>
          ) : (
            <span className="italic">No expected date</span>
          )}
          {payment.issued_on && (
            <>
              {" · Issued "}
              <span className="font-mono">
                {fmtDateLabel(payment.issued_on)}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            "font-mono text-sm font-medium",
            isOverdue && "text-[var(--coral)]"
          )}
        >
          {fmtCurrency(Number(payment.amount))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="primary"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await markPaymentReceived(payment.id);
                onBanner({
                  kind: "ok",
                  text: `Marked received: ${payment.client_name}`,
                });
              } catch (e) {
                onBanner({
                  kind: "err",
                  text: `Couldn't mark received: ${(e as Error).message}`,
                });
              }
            })
          }
          aria-label="Mark received"
        >
          <CheckCircle2 size={12} />
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil size={12} />
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Delete pending payment from "${payment.client_name}"?`))
              return;
            startTransition(async () => {
              try {
                await deletePendingPayment(payment.id);
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

function ReceivedRow({
  payment,
  streamName,
  onEdit,
  onBanner,
}: {
  payment: PendingPayment;
  streamName: string | null;
  onEdit: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <li className="py-2.5 flex items-center gap-3 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{payment.client_name}</span>
          {streamName && (
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px]">
              {streamName}
            </span>
          )}
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)]">
          Received{" "}
          <span className="font-mono">{fmtDateLabel(payment.received_on)}</span>
          {payment.description && <> · {payment.description}</>}
        </div>
      </div>
      <div className="font-mono text-[var(--teal)] shrink-0">
        {fmtCurrency(Number(payment.amount))}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await markPaymentUnreceived(payment.id);
              onBanner({ kind: "ok", text: "Moved back to pending." });
            } catch (e) {
              onBanner({
                kind: "err",
                text: `Couldn't move back: ${(e as Error).message}`,
              });
            }
          })
        }
        aria-label="Move back to pending"
      >
        <RotateCcw size={11} />
      </Button>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil size={12} />
      </Button>
    </li>
  );
}

function PendingPaymentForm({
  payment,
  streams,
  onClose,
  onBanner,
}: {
  payment: PendingPayment | null;
  streams: IncomeStream[];
  onClose: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        <h3 className="text-base font-semibold mb-4">
          {payment ? "Edit pending payment" : "Add pending payment"}
        </h3>
        <form
          action={(fd) => {
            if (payment) fd.set("id", payment.id);
            startTransition(async () => {
              try {
                await upsertPendingPayment(fd);
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
          <Field label="Client / source">
            <input
              name="client_name"
              required
              defaultValue={payment?.client_name ?? ""}
              placeholder="Acme Corp, Jane Doe…"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Amount owed ($)">
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                required
                defaultValue={payment?.amount ?? ""}
              />
            </Field>
            <Field label="Linked stream (optional)">
              <select
                name="stream_id"
                defaultValue={payment?.stream_id ?? "none"}
              >
                <option value="none">— none —</option>
                {streams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description (optional)">
            <input
              name="description"
              defaultValue={payment?.description ?? ""}
              placeholder="Final invoice, Project X"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Issued on (optional)">
              <input
                type="date"
                name="issued_on"
                defaultValue={payment?.issued_on ?? ""}
              />
            </Field>
            <Field label="Expected on">
              <input
                type="date"
                name="expected_on"
                defaultValue={payment?.expected_on ?? ""}
              />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <input name="notes" defaultValue={payment?.notes ?? ""} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {payment ? "Save" : "Add"}
            </Button>
          </div>
        </form>
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
  tone?: "good" | "bad";
}) {
  const cls =
    tone === "good"
      ? "text-[var(--teal)]"
      : tone === "bad"
        ? "text-[var(--coral)]"
        : "";
  return (
    <div className="rounded-md bg-[var(--muted)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className={cn("mt-0.5 font-mono text-sm font-medium", cls)}>
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
