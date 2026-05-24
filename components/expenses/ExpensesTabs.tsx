"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Trash2,
  Receipt,
  Pencil,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Expense } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
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
  const total = filtered.reduce((a, e) => a + Number(e.amount), 0);

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

      <Card>
        <CardTitle>
          {tab === "business" ? "Business Expenses" : "Personal Expenses"}
        </CardTitle>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={`No ${tab} expenses yet`}
            description="Add recurring fixed costs so cashflow math is accurate."
          />
        ) : grouped ? (
          <GroupedList expenses={filtered} onEdit={setEditing} onBanner={setBanner} />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                onEdit={() => setEditing(e)}
                onBanner={setBanner}
              />
            ))}
          </ul>
        )}

        {filtered.length > 0 && (
          <div className="mt-3 border-t border-[var(--border)] pt-2 flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Total/mo</span>
            <span className="font-mono font-medium">{fmtCurrency(total)}</span>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Add Expense</CardTitle>
        <form
          action={async (fd) => {
            fd.set("type", tab);
            try {
              await addExpense(fd);
              setBanner({ kind: "ok", text: "Added." });
              (document.getElementById("exp-form") as HTMLFormElement)?.reset();
              (document.getElementById("exp-name") as HTMLInputElement)?.focus();
            } catch (e) {
              setBanner({
                kind: "err",
                text: `Couldn't add: ${(e as Error).message}`,
              });
            }
          }}
          id="exp-form"
          className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"
        >
          <label className="block">
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
              Amount / mo
            </div>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              required
            />
          </label>
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
          <label className="block">
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              Category
            </div>
            <select name="category" defaultValue={cats[0]}>
              {cats.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-4">
            <Button type="submit">Add</Button>
          </div>
        </form>
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

function ExpenseRow({
  expense,
  onEdit,
  onBanner,
}: {
  expense: Expense;
  onEdit: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{expense.name}</div>
        <div className="text-[11px] text-[var(--muted-foreground)]">
          {expense.category || "General"}
        </div>
      </div>
      <span className="font-mono text-sm shrink-0">
        {fmtCurrency(Number(expense.amount))}/mo
      </span>
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
          <div className="grid grid-cols-3 gap-2">
            <Field label="Type">
              <select name="type" defaultValue={expense.type}>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </Field>
            <Field label="Amount / mo">
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                required
                defaultValue={expense.amount}
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
