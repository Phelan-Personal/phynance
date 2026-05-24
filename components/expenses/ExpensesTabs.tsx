"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2, Receipt } from "lucide-react";
import type { Expense } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
import { addExpense, deleteExpense } from "@/app/(app)/expenses/actions";

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

  const filtered = useMemo(
    () => expenses.filter((e) => e.type === tab),
    [expenses, tab]
  );
  const total = filtered.reduce((a, e) => a + e.amount, 0);

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
          <GroupedList expenses={filtered} />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((e) => (
              <ExpenseRow key={e.id} expense={e} />
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
            await addExpense(fd);
            (document.getElementById("exp-name") as HTMLInputElement)?.focus();
            (document.getElementById("exp-form") as HTMLFormElement)?.reset();
          }}
          id="exp-form"
          className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"
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
              Category
            </div>
            <select name="category" defaultValue={cats[0]}>
              {cats.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-3">
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
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
        {fmtCurrency(expense.amount)}/mo
      </span>
      <Button
        variant="danger"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await deleteExpense(expense.id);
          })
        }
        aria-label={`Delete ${expense.name}`}
      >
        <Trash2 size={12} />
      </Button>
    </li>
  );
}

function GroupedList({ expenses }: { expenses: Expense[] }) {
  const groups = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.category || "General";
    (acc[key] = acc[key] ?? []).push(e);
    return acc;
  }, {});
  const entries = Object.entries(groups).sort(
    (a, b) =>
      b[1].reduce((s, e) => s + e.amount, 0) -
      a[1].reduce((s, e) => s + e.amount, 0)
  );
  return (
    <div className="space-y-3">
      {entries.map(([cat, items]) => {
        const sum = items.reduce((a, e) => a + e.amount, 0);
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
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
