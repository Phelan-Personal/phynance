"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import type { Debt } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { CreditCard } from "lucide-react";
import {
  aprColor,
  cn,
  fmtCurrency,
  fmtMonthYear,
  fmtPct,
} from "@/lib/utils";
import { singleDebtPayoff } from "@/lib/calculations";
import { deleteDebt } from "@/app/(app)/debts/actions";
import { DebtForm } from "./DebtForm";

type SortKey = "interest_rate" | "balance" | "type" | "payoff";
type FilterKey = "all" | "business" | "personal";

export function DebtList({ debts }: { debts: Debt[] }) {
  const [sort, setSort] = useState<SortKey>("interest_rate");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editing, setEditing] = useState<Debt | null>(null);
  const [showForm, setShowForm] = useState(false);

  const active = useMemo(() => debts.filter((d) => !d.is_paid_off), [debts]);
  const paid = useMemo(() => debts.filter((d) => d.is_paid_off), [debts]);

  const filtered = useMemo(() => {
    let list = active;
    if (filter !== "all") list = list.filter((d) => d.type === filter);
    const sorted = [...list];
    if (sort === "interest_rate")
      sorted.sort((a, b) => b.interest_rate - a.interest_rate);
    if (sort === "balance") sorted.sort((a, b) => b.balance - a.balance);
    if (sort === "type") sorted.sort((a, b) => a.type.localeCompare(b.type));
    return sorted;
  }, [active, filter, sort]);

  const totalDebt = active.reduce((a, d) => a + d.balance, 0);
  const bizDebt = active
    .filter((d) => d.type === "business")
    .reduce((a, d) => a + d.balance, 0);
  const persDebt = active
    .filter((d) => d.type === "personal")
    .reduce((a, d) => a + d.balance, 0);
  const weightedApr = totalDebt
    ? active.reduce((a, d) => a + d.balance * d.interest_rate, 0) / totalDebt
    : 0;

  const withLimits = active.filter(
    (d) => d.credit_limit !== null && Number(d.credit_limit) > 0
  );
  const totalCreditLimit = withLimits.reduce(
    (a, d) => a + Number(d.credit_limit),
    0
  );
  const totalCreditUsed = withLimits.reduce((a, d) => a + d.balance, 0);
  const totalAvailable = totalCreditLimit - totalCreditUsed;
  const portfolioUtilization =
    totalCreditLimit > 0
      ? (totalCreditUsed / totalCreditLimit) * 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <SumCell label="Total Debt" value={fmtCurrency(totalDebt)} />
        <SumCell label="Business" value={fmtCurrency(bizDebt)} />
        <SumCell label="Personal" value={fmtCurrency(persDebt)} />
        <SumCell label="Weighted APR" value={fmtPct(weightedApr)} />
      </div>
      {withLimits.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <SumCell
            label="Credit Lines"
            value={fmtCurrency(totalCreditLimit)}
            sub={`${withLimits.length} account${withLimits.length === 1 ? "" : "s"}`}
          />
          <SumCell label="Used" value={fmtCurrency(totalCreditUsed)} />
          <SumCell
            label="Available"
            value={fmtCurrency(totalAvailable)}
            tone={
              totalAvailable < 0
                ? "bad"
                : totalAvailable < totalCreditLimit * 0.1
                  ? "warn"
                  : "good"
            }
          />
          <SumCell
            label="Utilization"
            value={fmtPct(portfolioUtilization)}
            tone={
              portfolioUtilization > 100
                ? "bad"
                : portfolioUtilization > 30
                  ? "warn"
                  : "good"
            }
            sub="ideal under 30%"
          />
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
              Add Debt
            </Button>
          }
        >
          Active Debts
        </CardTitle>

        {/* Filter + sort */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex rounded-md border border-[var(--border)] p-0.5 text-xs">
            {(["all", "business", "personal"] as FilterKey[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded-sm capitalize transition-colors",
                  filter === f
                    ? "bg-[var(--muted)] font-medium"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <span className="text-[var(--muted-foreground)]">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="!w-auto !py-1 !text-xs"
            >
              <option value="interest_rate">Interest Rate</option>
              <option value="balance">Balance</option>
              <option value="type">Type</option>
            </select>
          </label>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No debts yet"
            description="Add your business and personal debts to start planning a payoff."
            action={
              <Button onClick={() => setShowForm(true)}>Add your first debt</Button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((d) => (
              <DebtRow
                key={d.id}
                debt={d}
                onEdit={() => {
                  setEditing(d);
                  setShowForm(true);
                }}
              />
            ))}
          </ul>
        )}
      </Card>

      {paid.length > 0 && (
        <Card>
          <CardTitle>Paid Off ({paid.length})</CardTitle>
          <ul className="divide-y divide-[var(--border)]">
            {paid.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-[var(--muted-foreground)] line-through">
                  {d.name}
                </span>
                <span className="font-mono text-xs text-[var(--muted-foreground)]">
                  {fmtCurrency(d.original_balance ?? 0)} cleared
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showForm && (
        <DebtForm
          debt={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function DebtRow({ debt, onEdit }: { debt: Debt; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();
  const pct =
    debt.original_balance && debt.original_balance > 0
      ? Math.max(
          0,
          Math.min(100, (1 - debt.balance / debt.original_balance) * 100)
        )
      : null;
  const hasLimit =
    debt.credit_limit !== null && Number(debt.credit_limit) > 0;
  const creditLimit = hasLimit ? Number(debt.credit_limit) : 0;
  const available = hasLimit ? creditLimit - debt.balance : 0;
  const utilization = hasLimit ? (debt.balance / creditLimit) * 100 : 0;
  const overLimit = available < 0;

  const payoff = useMemo(
    () =>
      singleDebtPayoff(debt.balance, debt.interest_rate, debt.min_payment),
    [debt.balance, debt.interest_rate, debt.min_payment]
  );

  return (
    <li className="py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{debt.name}</span>
          <TypeBadge type={debt.type} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted-foreground)] flex-wrap">
          <span className={cn("font-mono", aprColor(debt.interest_rate))}>
            {fmtPct(debt.interest_rate)} APR
          </span>
          <span className="font-mono">Min {fmtCurrency(debt.min_payment)}/mo</span>
          {hasLimit && (
            <span
              className={cn(
                "font-mono",
                overLimit
                  ? "text-[var(--coral)]"
                  : utilization > 80
                    ? "text-[var(--coral)]"
                    : utilization > 30
                      ? "text-[var(--amber)]"
                      : "text-[var(--teal)]"
              )}
            >
              {overLimit
                ? `Over by ${fmtCurrency(Math.abs(available))}`
                : `${fmtCurrency(available)} available`}{" "}
              · {fmtPct(utilization)}
            </span>
          )}
        </div>
        <div className="mt-1 text-[11px]">
          {payoff.warning === "no_payment" ? (
            <span className="text-[var(--muted-foreground)]">
              Set a minimum payment to see payoff date
            </span>
          ) : payoff.warning === "min_too_low" ? (
            <span className="inline-flex items-center gap-1 text-[var(--coral)]">
              <AlertTriangle size={11} />
              Minimum doesn't cover interest — balance grows forever
            </span>
          ) : payoff.months === 0 ? (
            <span className="text-[var(--teal)]">Paid off</span>
          ) : payoff.months !== null ? (
            <span className="text-[var(--muted-foreground)]">
              Min-only payoff:{" "}
              <span className="font-mono text-[var(--foreground)]">
                {fmtMonthYear(payoff.months)}
              </span>{" "}
              <span className="font-mono">({payoff.months} mo)</span> ·{" "}
              <span className="font-mono">
                {fmtCurrency(payoff.totalInterest)}
              </span>{" "}
              interest
            </span>
          ) : null}
        </div>
        {hasLimit && (
          <div className="mt-2 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
            <div
              className={cn(
                "h-full",
                overLimit
                  ? "bg-[var(--coral)]"
                  : utilization > 80
                    ? "bg-[var(--coral)]"
                    : utilization > 30
                      ? "bg-[var(--amber)]"
                      : "bg-[var(--teal)]"
              )}
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </div>
        )}
        {!hasLimit && pct !== null && (
          <div className="mt-2 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
            <div
              className="h-full bg-[var(--teal)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm font-medium">
          {fmtCurrency(debt.balance)}
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)]">
          {hasLimit
            ? `of ${fmtCurrency(creditLimit)}`
            : "remaining"}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {debt.payment_url && (
          <a
            href={debt.payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--teal-dark)] hover:bg-[var(--teal-bg)] transition-colors"
            aria-label={`Pay ${debt.name}`}
          >
            <ExternalLink size={11} />
            Pay
          </a>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          aria-label={`Edit ${debt.name}`}
        >
          <Pencil size={12} />
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Delete "${debt.name}"?`)) return;
            startTransition(async () => {
              await deleteDebt(debt.id);
            });
          }}
          aria-label={`Delete ${debt.name}`}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </li>
  );
}

export function TypeBadge({ type }: { type: "personal" | "business" }) {
  const cls =
    type === "business"
      ? "bg-[var(--blue-bg)] text-[var(--blue-fg)]"
      : "bg-[var(--purple-bg)] text-[var(--purple-fg)]";
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
        cls
      )}
    >
      {type}
    </span>
  );
}

function SumCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const cls =
    tone === "good"
      ? "text-[var(--teal)]"
      : tone === "warn"
        ? "text-[var(--amber)]"
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
