"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  History,
  Plus,
  Trash2,
} from "lucide-react";
import type { Debt, DebtPayment } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn, fmtCurrency } from "@/lib/utils";
import { upsertDebt } from "@/app/(app)/debts/actions";
import {
  deleteDebtPayment,
  logDebtPayment,
} from "@/app/(app)/debts/payment-actions";

export function DebtForm({
  debt,
  payments = [],
  onClose,
}: {
  debt: Debt | null;
  payments?: DebtPayment[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-4">
          {debt ? "Edit Debt" : "Add a Debt"}
        </h3>
        {banner && (
          <div
            className={cn(
              "mb-3 rounded-md border px-3 py-2 text-xs flex items-start gap-2",
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
        <form
          action={(fd) => {
            startTransition(async () => {
              await upsertDebt(fd);
              onClose();
            });
          }}
          className="space-y-3"
        >
          {debt && <input type="hidden" name="id" value={debt.id} />}
          <Field label="Name">
            <input
              name="name"
              required
              defaultValue={debt?.name ?? ""}
              placeholder="Chase Sapphire, SBA Loan…"
              autoFocus
            />
          </Field>
          <Field label="Type">
            <select name="type" defaultValue={debt?.type ?? "personal"}>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Balance">
              <input
                type="number"
                name="balance"
                required
                step="0.01"
                min="0"
                defaultValue={debt?.balance ?? ""}
              />
            </Field>
            <Field label="APR %">
              <input
                type="number"
                name="interest_rate"
                step="0.01"
                min="0"
                defaultValue={debt?.interest_rate ?? ""}
              />
            </Field>
            <Field label="Min/mo">
              <input
                type="number"
                name="min_payment"
                step="0.01"
                min="0"
                defaultValue={debt?.min_payment ?? ""}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Original balance (optional)">
              <input
                type="number"
                name="original_balance"
                step="0.01"
                min="0"
                defaultValue={debt?.original_balance ?? ""}
              />
            </Field>
            <Field label="Credit limit (cards, LOCs)">
              <input
                type="number"
                name="credit_limit"
                step="0.01"
                min="0"
                defaultValue={debt?.credit_limit ?? ""}
                placeholder="e.g. 10000"
              />
            </Field>
          </div>
          <Field label="Due day (1–31)">
            <input
              type="number"
              name="due_day"
              min="1"
              max="31"
              step="1"
              defaultValue={debt?.due_day ?? ""}
              placeholder="e.g. 15"
            />
          </Field>
          <Field label="Payment URL (lender login)">
            <input
              type="url"
              name="payment_url"
              defaultValue={debt?.payment_url ?? ""}
              placeholder="chase.com or https://chase.com"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="is_auto_pay"
              defaultChecked={debt?.is_auto_pay ?? false}
            />
            <span>
              Minimum paid automatically each month (auto-pay enabled)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Rewards (cards)">
              <input
                name="rewards_description"
                defaultValue={debt?.rewards_description ?? ""}
                placeholder="2% cash back, 5% groceries"
              />
            </Field>
            <Field label="Rewards balance ($)">
              <input
                type="number"
                name="rewards_balance"
                step="0.01"
                min="0"
                defaultValue={debt?.rewards_balance ?? ""}
                placeholder="0"
              />
            </Field>
          </div>
          <Field label="Notes">
            <input name="notes" defaultValue={debt?.notes ?? ""} />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {debt ? "Save" : "Add Debt"}
            </Button>
          </div>
        </form>

        {debt && (
          <PaymentHistorySection
            debt={debt}
            payments={payments}
            onBanner={setBanner}
          />
        )}
      </div>
    </div>
  );
}

function PaymentHistorySection({
  debt,
  payments,
  onBanner,
}: {
  debt: Debt;
  payments: DebtPayment[];
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const totalPaid = payments.reduce((a, p) => a + Number(p.amount), 0);

  return (
    <div className="mt-6 pt-4 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold inline-flex items-center gap-2">
          <History size={14} />
          Payment history
        </h4>
        {payments.length > 0 && (
          <div className="text-[10px] text-[var(--muted-foreground)]">
            {payments.length} payment{payments.length === 1 ? "" : "s"} ·{" "}
            <span className="font-mono">{fmtCurrency(totalPaid)}</span> total
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("debt_id", debt.id);
          fd.set("amount", amount);
          fd.set("payment_date", date);
          fd.set("notes", notes);
          startTransition(async () => {
            try {
              await logDebtPayment(fd);
              onBanner({
                kind: "ok",
                text: `Logged ${fmtCurrency(parseFloat(amount) || 0)} payment.`,
              });
              setAmount("");
              setNotes("");
              setDate(new Date().toISOString().slice(0, 10));
            } catch (err) {
              onBanner({
                kind: "err",
                text: `Couldn't log payment: ${(err as Error).message}`,
              });
            }
          });
        }}
        className="space-y-2 mb-4"
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              Payment amount ($)
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 207"
              autoFocus={payments.length === 0}
            />
          </label>
          <label className="block">
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              Date
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Notes (optional)
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="confirmation #, extra principal, etc."
          />
        </label>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-[var(--muted-foreground)]">
            Current balance:{" "}
            <span className="font-mono">{fmtCurrency(Number(debt.balance))}</span>
            {amount && parseFloat(amount) > 0 && (
              <>
                {" → "}
                <span className="font-mono text-[var(--teal-dark)]">
                  {fmtCurrency(
                    Math.max(0, Number(debt.balance) - parseFloat(amount))
                  )}
                </span>
              </>
            )}
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            <Plus size={11} /> Log payment
          </Button>
        </div>
      </form>

      {payments.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)] py-2">
          No payments logged yet. Logging a payment updates this debt's balance
          and saves a snapshot you can review later.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {payments.slice(0, 20).map((p) => (
            <li
              key={p.id}
              className="py-2 flex items-center gap-2 text-xs"
            >
              <span className="font-mono text-[var(--muted-foreground)] shrink-0 w-20">
                {p.payment_date}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[var(--teal-dark)]">
                  −{fmtCurrency(Number(p.amount))}
                  {p.balance_after !== null && (
                    <span className="text-[var(--muted-foreground)] font-normal ml-2">
                      → {fmtCurrency(Number(p.balance_after))}
                    </span>
                  )}
                </div>
                {p.notes && (
                  <div className="text-[10px] text-[var(--muted-foreground)] italic truncate">
                    {p.notes}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (
                    !confirm(
                      `Delete this payment? The amount will be added back to the debt balance.`
                    )
                  )
                    return;
                  startTransition(async () => {
                    try {
                      await deleteDebtPayment(p.id);
                      onBanner({
                        kind: "ok",
                        text: "Payment deleted and balance restored.",
                      });
                    } catch (err) {
                      onBanner({
                        kind: "err",
                        text: `Couldn't delete: ${(err as Error).message}`,
                      });
                    }
                  });
                }}
                disabled={isPending}
                className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--coral)]"
                aria-label="Delete payment"
              >
                <Trash2 size={11} />
              </button>
            </li>
          ))}
          {payments.length > 20 && (
            <li className="py-2 text-[10px] text-[var(--muted-foreground)] text-center">
              Showing 20 most recent of {payments.length} payments
            </li>
          )}
        </ul>
      )}
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
