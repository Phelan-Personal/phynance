"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Target,
  Shield,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Star,
  Pencil,
  Trash2,
  Archive,
  AlertCircle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import type {
  Asset,
  FinancialSettings,
  Goal,
  GoalKind,
} from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency, fmtMonthYear, fmtPct } from "@/lib/utils";
import {
  GOAL_KIND_LABEL,
  computeGoalProgress,
  computeIncomeRequirement,
} from "@/lib/goals";

const KIND_ICON: Record<GoalKind, typeof Target> = {
  emergency_fund: Shield,
  retirement: PiggyBank,
  savings: PiggyBank,
  investment: TrendingUp,
  debt_payoff: CreditCard,
  custom: Star,
};

const KIND_TONE: Record<GoalKind, string> = {
  emergency_fund: "bg-[var(--amber-bg)] text-[var(--amber)]",
  retirement: "bg-[var(--blue-bg)] text-[var(--blue-fg)]",
  savings: "bg-[var(--teal-bg)] text-[var(--teal-dark)]",
  investment: "bg-[var(--purple-bg)] text-[var(--purple-fg)]",
  debt_payoff: "bg-[var(--coral-bg)] text-[var(--coral)]",
  custom: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export function GoalsPlanner({
  goals,
  assets,
  settings,
  ctx,
  upsertGoal,
  deleteGoal,
}: {
  goals: Goal[];
  assets: Asset[];
  settings: FinancialSettings;
  ctx: {
    currentGross: number;
    bizExpenses: number;
    persExpenses: number;
    bizDebtMins: number;
    persDebtMins: number;
  };
  upsertGoal: (formData: FormData) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const active = goals.filter((g) => !g.is_archived);
  const archived = goals.filter((g) => g.is_archived);

  const progresses = useMemo(
    () =>
      active
        .map((g) => computeGoalProgress(g, assets))
        .sort((a, b) => {
          // overdue first, then by priority, then by months remaining
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
          if (a.goal.priority !== b.goal.priority)
            return (a.goal.priority ?? 5) - (b.goal.priority ?? 5);
          const am = a.monthsRemaining ?? 999;
          const bm = b.monthsRemaining ?? 999;
          return am - bm;
        }),
    [active, assets]
  );

  const activeProgresses = progresses.filter((p) => !p.isDone);
  const doneProgresses = progresses.filter((p) => p.isDone);

  const totalGoalContributions = activeProgresses.reduce(
    (a, p) => a + p.monthlyNeeded,
    0
  );

  const req = useMemo(
    () =>
      computeIncomeRequirement({
        bizExpenses: ctx.bizExpenses,
        persExpenses: ctx.persExpenses,
        bizDebtMins: ctx.bizDebtMins,
        persDebtMins: ctx.persDebtMins,
        draw: Number(settings.personal_draw),
        seTaxRate: Number(settings.se_tax_rate),
        incomeTaxRate: Number(settings.income_tax_rate),
        goalContributions: totalGoalContributions,
        currentGross: ctx.currentGross,
      }),
    [ctx, settings, totalGoalContributions]
  );

  const hasGap = req.gap > 0;

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

      {/* Income requirement summary */}
      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Target size={14} />
            Income required to fund every goal
          </span>
        </CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Cell
            label="Goal contributions"
            value={`${fmtCurrency(req.goalContributions)}/mo`}
            sub={`${activeProgresses.length} active goal${activeProgresses.length === 1 ? "" : "s"}`}
          />
          <Cell
            label="Existing monthly outflow"
            value={`${fmtCurrency(req.monthlyOutflow)}/mo`}
            sub="expenses + debt mins + draw"
          />
          <Cell
            label="Gross revenue needed"
            value={`${fmtCurrency(req.grossNeeded)}/mo`}
            sub={`includes ${fmtPct(
              Number(settings.se_tax_rate) +
                Number(settings.income_tax_rate)
            )} taxes`}
            tone="primary"
          />
          <Cell
            label={hasGap ? "Income gap" : "Surplus"}
            value={`${hasGap ? "+" : ""}${fmtCurrency(Math.abs(req.gap))}/mo`}
            sub={
              hasGap
                ? "more revenue needed each month"
                : "current income covers it"
            }
            tone={hasGap ? "bad" : "good"}
            trend={hasGap ? "up" : "down"}
          />
        </div>
        <div className="rounded-md bg-[var(--muted)] px-3 py-2.5 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">
              Current gross monthly
            </span>
            <span className="font-mono">{fmtCurrency(req.currentGross)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Gross needed monthly</span>
            <span className="font-mono">{fmtCurrency(req.grossNeeded)}</span>
          </div>
          <div className="border-t border-[var(--border)] pt-1.5 flex justify-between">
            <span
              className={cn(
                "text-[var(--muted-foreground)]",
                hasGap && "text-[var(--coral)]"
              )}
            >
              {hasGap ? "Shortfall (per month)" : "Surplus (per month)"}
            </span>
            <span
              className={cn(
                "font-mono font-semibold",
                hasGap ? "text-[var(--coral)]" : "text-[var(--teal)]"
              )}
            >
              {hasGap ? "+" : ""}
              {fmtCurrency(Math.abs(req.gap))}
            </span>
          </div>
          {hasGap && (
            <div className="text-[11px] text-[var(--muted-foreground)] mt-2">
              You need <span className="font-mono">{fmtCurrency(req.gap)}</span>{" "}
              more in monthly gross revenue, or about{" "}
              <span className="font-mono">
                {fmtCurrency(req.gap * 12)}
              </span>{" "}
              more per year. Cut goal contributions, push out target dates,
              or grow income — pick your lever.
            </div>
          )}
        </div>
      </Card>

      {/* Active goals */}
      <Card>
        <CardTitle
          right={
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              Add goal
            </Button>
          }
        >
          Active goals ({activeProgresses.length})
        </CardTitle>

        {activeProgresses.length === 0 && doneProgresses.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Add a goal — emergency fund, retirement, kids' college, sabbatical, anything with a target amount and a date. We'll roll the monthly contributions into the gross-revenue calculation above."
            action={
              <Button onClick={() => setShowForm(true)}>
                Add your first goal
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {activeProgresses.map((p) => (
              <GoalRow
                key={p.goal.id}
                progress={p}
                onEdit={() => {
                  setEditing(p.goal);
                  setShowForm(true);
                }}
                onBanner={setBanner}
                deleteGoal={deleteGoal}
              />
            ))}
          </ul>
        )}
      </Card>

      {doneProgresses.length > 0 && (
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[var(--teal)]" />
              Goals reached ({doneProgresses.length})
            </span>
          </CardTitle>
          <ul className="divide-y divide-[var(--border)]">
            {doneProgresses.map((p) => (
              <GoalRow
                key={p.goal.id}
                progress={p}
                onEdit={() => {
                  setEditing(p.goal);
                  setShowForm(true);
                }}
                onBanner={setBanner}
                deleteGoal={deleteGoal}
              />
            ))}
          </ul>
        </Card>
      )}

      {archived.length > 0 && (
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Archive size={14} className="text-[var(--muted-foreground)]" />
              Archived ({archived.length})
            </span>
          </CardTitle>
          <ul className="divide-y divide-[var(--border)]">
            {archived.map((g) => (
              <li
                key={g.id}
                className="py-2 flex items-center justify-between gap-2 text-xs opacity-70"
              >
                <span className="truncate">{g.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(g);
                    setShowForm(true);
                  }}
                >
                  <Pencil size={11} />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showForm && (
        <GoalForm
          goal={editing}
          assets={assets}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onBanner={setBanner}
          upsertGoal={upsertGoal}
        />
      )}
    </div>
  );
}

function GoalRow({
  progress,
  onEdit,
  onBanner,
  deleteGoal,
}: {
  progress: ReturnType<typeof computeGoalProgress>;
  onEdit: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
  deleteGoal: (id: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const { goal, currentAmount, monthlyNeeded, progressPct, isDone, isOverdue, monthsRemaining, source } = progress;
  const Icon = KIND_ICON[goal.kind];

  return (
    <li className="py-3 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div
          className={cn("shrink-0 rounded-md p-1.5", KIND_TONE[goal.kind])}
        >
          <Icon size={14} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{goal.name}</span>
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px]">
              {GOAL_KIND_LABEL[goal.kind]}
            </span>
            {source === "linked" && (
              <span className="rounded bg-[var(--blue-bg)] text-[var(--blue-fg)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium">
                Linked
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--coral-bg)] text-[var(--coral)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium">
                <AlertCircle size={10} /> Overdue
              </span>
            )}
            {isDone && (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--teal-bg)] text-[var(--teal-dark)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium">
                <CheckCircle2 size={10} /> Reached
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            {fmtCurrency(currentAmount)} of {fmtCurrency(Number(goal.target_amount))}
            {goal.target_date && (
              <>
                {" · by "}
                <span className="font-mono">
                  {new Date(goal.target_date).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {monthsRemaining !== null && monthsRemaining > 0 && (
                  <span> · {monthsRemaining} mo left</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {!isDone && (
            <>
              <div className="font-mono text-sm font-medium">
                {fmtCurrency(monthlyNeeded)}/mo
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)]">
                {goal.monthly_contribution_override !== null
                  ? "manual"
                  : "computed"}
              </div>
            </>
          )}
          {isDone && (
            <div className="text-[var(--teal)] text-xs font-medium">
              Reached
            </div>
          )}
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
              if (!confirm(`Delete goal "${goal.name}"?`)) return;
              startTransition(async () => {
                try {
                  await deleteGoal(goal.id);
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
      </div>
      <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden ml-8">
        <div
          className={cn(
            "h-full",
            isDone
              ? "bg-[var(--teal)]"
              : isOverdue
                ? "bg-[var(--coral)]"
                : "bg-[var(--teal)]"
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="ml-8 text-[10px] text-[var(--muted-foreground)] flex justify-between">
        <span>{fmtPct(progressPct)} complete</span>
        {goal.notes && (
          <span className="truncate italic ml-2">{goal.notes}</span>
        )}
      </div>
    </li>
  );
}

function GoalForm({
  goal,
  assets,
  onClose,
  onBanner,
  upsertGoal,
}: {
  goal: Goal | null;
  assets: Asset[];
  onClose: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
  upsertGoal: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? "savings");
  const [linkedId, setLinkedId] = useState<string>(
    goal?.linked_asset_id ?? "none"
  );
  const [manualOverride, setManualOverride] = useState<boolean>(
    goal?.monthly_contribution_override !== null &&
      goal?.monthly_contribution_override !== undefined
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold mb-4">
          {goal ? "Edit goal" : "Add goal"}
        </h3>
        <form
          action={(fd) => {
            if (goal) fd.set("id", goal.id);
            if (!manualOverride) fd.delete("monthly_contribution_override");
            startTransition(async () => {
              try {
                await upsertGoal(fd);
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
              defaultValue={goal?.name ?? ""}
              placeholder="Emergency fund, retirement, sabbatical…"
              autoFocus
            />
          </Field>
          <Field label="Kind">
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as GoalKind)}
            >
              <option value="emergency_fund">Emergency fund</option>
              <option value="retirement">Retirement</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
              <option value="debt_payoff">Debt payoff (extra)</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Target amount ($)">
              <input
                type="number"
                name="target_amount"
                step="0.01"
                min="0"
                required
                defaultValue={goal?.target_amount ?? ""}
              />
            </Field>
            <Field label="Target date">
              <input
                type="date"
                name="target_date"
                defaultValue={goal?.target_date ?? ""}
              />
            </Field>
          </div>

          {assets.length > 0 && (
            <Field label="Link to asset (auto-track progress)">
              <select
                name="linked_asset_id"
                value={linkedId}
                onChange={(e) => setLinkedId(e.target.value)}
              >
                <option value="none">— manual tracking —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {linkedId === "none" && (
            <Field label="Current amount ($)">
              <input
                type="number"
                name="current_amount"
                step="0.01"
                min="0"
                defaultValue={goal?.current_amount ?? 0}
              />
            </Field>
          )}
          {linkedId !== "none" && (
            <div className="rounded-md bg-[var(--muted)] px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
              Current amount will auto-pull from the linked asset. Update the
              asset balance on /assets and this goal's progress follows.
            </div>
          )}

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(e) => setManualOverride(e.target.checked)}
            />
            <span>Override monthly contribution (instead of auto-computing)</span>
          </label>
          {manualOverride && (
            <Field label="Monthly contribution ($)">
              <input
                type="number"
                name="monthly_contribution_override"
                step="0.01"
                min="0"
                defaultValue={
                  goal?.monthly_contribution_override ?? ""
                }
                placeholder="e.g. 500"
              />
            </Field>
          )}

          <Field label="Notes">
            <input name="notes" defaultValue={goal?.notes ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="is_archived"
              defaultChecked={goal?.is_archived ?? false}
            />
            <span>Archive (excluded from income requirement)</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {goal ? "Save" : "Create goal"}
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

function Cell({
  label,
  value,
  sub,
  tone,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "good" | "bad";
  trend?: "up" | "down";
}) {
  const cls =
    tone === "good"
      ? "text-[var(--teal)]"
      : tone === "bad"
        ? "text-[var(--coral)]"
        : tone === "primary"
          ? "text-[var(--teal-dark)]"
          : "";
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
          "mt-0.5 font-mono text-sm font-medium flex items-center gap-1",
          cls
        )}
      >
        {trend === "up" && <ArrowUp size={11} />}
        {trend === "down" && <ArrowDown size={11} />}
        <span>{value}</span>
      </div>
      {sub && (
        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}
