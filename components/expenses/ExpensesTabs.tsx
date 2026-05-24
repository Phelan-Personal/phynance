"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Trash2,
  Receipt,
  Pencil,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Expense, ExpenseFrequency } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
import {
  FREQUENCY_LABEL,
  MONTH_LABELS,
  monthlyAmortized,
} from "@/lib/expenses";
import {
  addExpense,
  deleteExpense,
  updateExpense,
} from "@/app/(app)/expenses/actions";

const BIZ_CATEGORIES = [
  "Software/Tools",
  "Payroll",
  "Marketing",
  "Office/Rent",
  "Insurance",
  "Contractors",
  "Subscriptions",
  "Other",
];

const PERS_CATEGORIES = [
  "Housing",
  "Food & Dining",
  "Transportation",
  "Utilities",
  "Subscriptions",
  "Insurance",
  "Healthcare",
  "Entertainment",
  "Other",
];

type Tab = "business" | "personal";

export function ExpensesTabs({ expenses }: { expenses: Expense[] }) {
  const [tab, setTab] = useState<Tab>("business");
  const [grouped, setGrouped] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const filtered = useMemo(
    () => expenses.filter((e) => e.type === tab),
    [expenses, tab]
  );
  const monthlyOnes = useMemo(
    () => filtered.filter((e) => e.frequency === "monthly"),
    [filtered]
  );
  const lessFrequent = useMemo(
    () => filtered.filter((e) => e.frequency !== "monthly"),
    [filtered]
  );

  const monthlyTotal = monthlyOnes.reduce((a, e) => a + Number(e.amount), 0);
  const annualTotal = lessFrequent.reduce(
    (a, e) =>
      a +
      Number(e.amount) *
        (e.frequency === "annual" ? 1 : e.frequency === "quarterly" ? 4 : 12),
    0
  );
  const amortizedFromLessFrequent = lessFrequent.reduce(
    (a, e) => a + monthlyAmortized(e),
    0
  );
  const totalMonthlyEquivalent = monthlyTotal + amortizedFromLessFrequent;

  const cats = tab === "business" ? BIZ_CATEGORIES : PERS_CATEGORIES;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-md border border-[var(--border)] p-0.5">
          {(["business", "personal"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1 text-xs rounded-sm capitalize transition-colors",
                tab === t
                  ? "bg-[var(--muted)] font-medium"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
          />
          Group by category
        </label>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <SummaryCell
          label="Monthly recurring"
          value={`${fmtCurrency(monthlyTotal)}/mo`}
          sub={`${monthlyOnes.length} item${monthlyOnes.length === 1 ? "" : "s"}`}
        />
        <SummaryCell
          label="Annual + quarterly (yearly)"
          value={fmtCurrency(annualTotal)}
          sub={`${lessFrequent.length} item${lessFrequent.length === 1 ? "" : "s"} • ${fmtCurrency(amortizedFromLessFrequent)}/mo amortized`}
        />
        <SummaryCell
          label="Effective monthly total"
          value={`${fmtCurrency(totalMonthlyEquivalent)}/mo`}
          tone="primary"
          sub="used in the cashflow waterfall"
        />
      </div>

      <Card>
        <CardTitle>
          {tab === "business" ? "Business — Monthly" : "Personal — Monthly"}
        </CardTitle>

        {monthlyOnes.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No monthly expenses yet"
            description="Add recurring fixed costs that hit every month."
          />
        ) : grouped ? (
          <GroupedList
            expenses={monthlyOnes}
            onEdit={setEditing}
            onBanner={setBanner}
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {monthlyOnes.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                onEdit={() => setEditing(e)}
                onBanner={setBanner}
              />
            ))}
          </ul>
        )}

        {monthlyOnes.length > 0 && (
          <div className="mt-3 border-t border-[var(--border)] pt-2 flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Total / mo</span>
            <span className="font-mono font-medium">
              {fmtCurrency(monthlyTotal)}
            </span>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>
          {tab === "business"
            ? "Business — Annual & Quarterly"
            : "Personal — Annual & Quarterly"}
        </CardTitle>
        {lessFrequent.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-3">
            No annual or quarterly expenses yet. Use the form below — pick
            Annual or Quarterly and set the month it hits.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {lessFrequent.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                showAmortized
                onEdit={() => setEditing(e)}
                onBanner={setBanner}
              />
            ))}
          </ul>
        )}
        {lessFrequent.length > 0 && (
          <div className="mt-3 border-t border-[var(--border)] pt-2 flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">
              Amortized / mo
            </span>
            <span className="font-mono font-medium">
              {fmtCurrency(amortizedFromLessFrequent)}
            </span>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Add Expense</CardTitle>
        <AddExpenseForm
          tab={tab}
          categories={cats}
          onAdded={() => setBanner({ kind: "ok", text: "Added." })}
          onError={(msg) =>
            setBanner({ kind: "err", text: `Couldn't add: ${msg}` })
          }
        />
      </Card>

      {editing && (
        <EditExpenseModal
          expense={editing}
          categories={editing.type === "business" ? BIZ_CATEGORIES : PERS_CATEGORIES}
          onClose={() => setEditing(null)}
          onBanner={setBanner}
        />
      )}
    </div>
  );
}

function AddExpenseForm({
  tab,
  categories,
  onAdded,
  onError,
}: {
  tab: Tab;
  categories: string[];
  onAdded: () => void;
  onError: (msg: string) => void;
}) {
  const [frequency, setFrequency] = useState<ExpenseFrequency>("monthly");
  const [amount, setAmount] = useState("");

  const amountNum = parseFloat(amount) || 0;
  const amortized =
    frequency === "annual"
      ? amountNum / 12
      : frequency === "quarterly"
        ? amountNum / 3
        : amountNum;

  return (
    <form
      action={async (fd) => {
        fd.set("type", tab);
        try {
          await addExpense(fd);
          onAdded();
          const formEl = document.getElementById(
            "exp-form"
          ) as HTMLFormElement | null;
          formEl?.reset();
          setAmount("");
          setFrequency("monthly");
          (document.getElementById("exp-name") as HTMLInputElement)?.focus();
        } catch (e) {
          onError((e as Error).message);
        }
      }}
      id="exp-form"
      className="space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <label className="block md:col-span-2">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Name
          </div>
          <input
            id="exp-name"
            name="name"
            required
            placeholder={
              tab === "business" ? "Payroll, software…" : "Rent, car payment…"
            }
          />
        </label>
        <label className="block">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Frequency
          </div>
          <select
            name="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ExpenseFrequency)}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </label>
        <label className="block">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            {frequency === "monthly" ? "Amount / mo" : "Amount per charge"}
          </div>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <label className="block">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Due day (1–31)
          </div>
          <input
            type="number"
            name="due_day"
            min="1"
            max="31"
            step="1"
            placeholder="e.g. 1"
          />
        </label>
        {frequency !== "monthly" && (
          <label className="block">
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              {frequency === "annual" ? "Due month" : "First charge month"}
            </div>
            <select name="due_month" defaultValue="1">
              {MONTH_LABELS.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Category
          </div>
          <select name="category" defaultValue={categories[0]}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {frequency !== "monthly" && amountNum > 0 && (
        <div className="rounded-md bg-[var(--muted)] px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
          Hits as <strong>{fmtCurrency(amountNum)}</strong> on the chosen day.
          Amortizes to{" "}
          <strong className="font-mono">{fmtCurrency(amortized)}/mo</strong> in
          the cashflow waterfall.{" "}
          {frequency === "quarterly" &&
            "Quarterly = first month + every 3rd month after."}
        </div>
      )}

      <div>
        <Button type="submit">Add expense</Button>
      </div>
    </form>
  );
}

function ExpenseRow({
  expense,
  showAmortized,
  onEdit,
  onBanner,
}: {
  expense: Expense;
  showAmortized?: boolean;
  onEdit: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const amort = monthlyAmortized(expense);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{expense.name}</div>
        <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-2 flex-wrap">
          <span>{expense.category || "General"}</span>
          {expense.due_day && <span>· day {expense.due_day}</span>}
          {expense.frequency !== "monthly" && expense.due_month && (
            <span>· {MONTH_LABELS[expense.due_month - 1]}</span>
          )}
          {expense.frequency !== "monthly" && (
            <span className="rounded bg-[var(--amber-bg)] text-[var(--amber)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              {FREQUENCY_LABEL[expense.frequency]}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm">
          {fmtCurrency(Number(expense.amount))}
          {expense.frequency === "monthly"
            ? "/mo"
            : expense.frequency === "annual"
              ? "/yr"
              : "/qtr"}
        </div>
        {showAmortized && (
          <div className="text-[10px] text-[var(--muted-foreground)] font-mono">
            ≈ {fmtCurrency(amort)}/mo
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        aria-label={`Edit ${expense.name}`}
      >
        <Pencil size={12} />
      </Button>
      <Button
        variant="danger"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Delete "${expense.name}"?`)) return;
          startTransition(async () => {
            try {
              await deleteExpense(expense.id);
            } catch (e) {
              onBanner({
                kind: "err",
                text: `Couldn't delete: ${(e as Error).message}`,
              });
            }
          });
        }}
        aria-label={`Delete ${expense.name}`}
      >
        <Trash2 size={12} />
      </Button>
    </li>
  );
}

function GroupedList({
  expenses,
  onEdit,
  onBanner,
}: {
  expenses: Expense[];
  onEdit: (e: Expense) => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const groups = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.category || "General";
    (acc[key] = acc[key] ?? []).push(e);
    return acc;
  }, {});
  const entries = Object.entries(groups).sort(
    (a, b) =>
      b[1].reduce((s, e) => s + Number(e.amount), 0) -
      a[1].reduce((s, e) => s + Number(e.amount), 0)
  );
  return (
    <div className="space-y-3">
      {entries.map(([cat, items]) => {
        const sum = items.reduce((a, e) => a + Number(e.amount), 0);
        return (
          <div key={cat}>
            <div className="flex justify-between text-xs font-medium border-b border-[var(--border)] pb-1">
              <span>
                {cat}{" "}
                <span className="text-[var(--muted-foreground)] font-normal">
                  ({items.length})
                </span>
              </span>
              <span className="font-mono">{fmtCurrency(sum)}/mo</span>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {items.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  onEdit={() => onEdit(e)}
                  onBanner={onBanner}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EditExpenseModal({
  expense,
  categories,
  onClose,
  onBanner,
}: {
  expense: Expense;
  categories: string[];
  onClose: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [frequency, setFrequency] = useState<ExpenseFrequency>(
    expense.frequency
  );
  const [amount, setAmount] = useState(String(expense.amount));

  const amountNum = parseFloat(amount) || 0;
  const amortized =
    frequency === "annual"
      ? amountNum / 12
      : frequency === "quarterly"
        ? amountNum / 3
        : amountNum;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        <h3 className="text-base font-semibold mb-4">Edit Expense</h3>
        <form
          action={(fd) => {
            fd.set("id", expense.id);
            startTransition(async () => {
              try {
                await updateExpense(fd);
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
              defaultValue={expense.name}
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type">
              <select name="type" defaultValue={expense.type}>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </Field>
            <Field label="Frequency">
              <select
                name="frequency"
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as ExpenseFrequency)
                }
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field
              label={frequency === "monthly" ? "Amount / mo" : "Amount per charge"}
            >
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Due day">
              <input
                type="number"
                name="due_day"
                min="1"
                max="31"
                step="1"
                defaultValue={expense.due_day ?? ""}
              />
            </Field>
          </div>
          {frequency !== "monthly" && (
            <Field
              label={
                frequency === "annual" ? "Due month" : "First charge month"
              }
            >
              <select
                name="due_month"
                defaultValue={expense.due_month ?? 1}
              >
                {MONTH_LABELS.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {frequency !== "monthly" && amountNum > 0 && (
            <div className="rounded-md bg-[var(--muted)] px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
              Amortizes to{" "}
              <strong className="font-mono">{fmtCurrency(amortized)}/mo</strong>{" "}
              in the cashflow waterfall.
            </div>
          )}
          <Field label="Category">
            <select
              name="category"
              defaultValue={expense.category ?? categories[0]}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
              {expense.category &&
                !categories.includes(expense.category) && (
                  <option>{expense.category}</option>
                )}
            </select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Save
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

function SummaryCell({
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
        tone === "primary"
          ? "bg-[var(--teal-bg)] text-[var(--teal-dark)]"
          : "bg-[var(--muted)]"
      )}
    >
      <div
        className={cn(
          "text-[10px] uppercase tracking-wider",
          tone === "primary"
            ? "text-[var(--teal-dark)]/80"
            : "text-[var(--muted-foreground)]"
        )}
      >
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-medium">{value}</div>
      {sub && (
        <div
          className={cn(
            "text-[10px] mt-0.5",
            tone === "primary"
              ? "text-[var(--teal-dark)]/70"
              : "text-[var(--muted-foreground)]"
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
