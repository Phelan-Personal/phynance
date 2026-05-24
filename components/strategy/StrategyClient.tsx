"use client";

import { useMemo, useState, useTransition } from "react";
import {
  TrendingDown,
  Snowflake,
  Building2,
  ReceiptText,
  CalendarClock,
  ArrowLeftRight,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn, fmtCurrency, fmtMonthYear, fmtPct } from "@/lib/utils";
import {
  getPayoffPlan,
  runBurndown,
  type CalcDebt,
} from "@/lib/calculations";
import { TypeBadge } from "@/components/debts/DebtList";
import { setStrategy } from "@/app/(app)/strategy/actions";

export function StrategyClient({
  debts,
  initialStrategy,
  autoExtra,
  bizExpensesTotal,
}: {
  debts: CalcDebt[];
  initialStrategy: "avalanche" | "snowball";
  autoExtra: number;
  bizExpensesTotal: number;
}) {
  const [strategy, setStrategyState] = useState<"avalanche" | "snowball">(
    initialStrategy
  );
  const [sliderExtra, setSliderExtra] = useState(autoExtra);
  const [isPending, startTransition] = useTransition();

  const maxSlider = Math.max(3000, autoExtra * 2);

  const planAvalanche = useMemo(
    () => getPayoffPlan(debts, autoExtra, "avalanche"),
    [debts, autoExtra]
  );
  const planSnowball = useMemo(
    () => getPayoffPlan(debts, autoExtra, "snowball"),
    [debts, autoExtra]
  );

  const burnAvalanche = useMemo(
    () => runBurndown(debts, autoExtra, "avalanche"),
    [debts, autoExtra]
  );
  const burnSnowball = useMemo(
    () => runBurndown(debts, autoExtra, "snowball"),
    [debts, autoExtra]
  );

  const burnMinOnly = useMemo(
    () => runBurndown(debts, 0, strategy, true),
    [debts, strategy]
  );
  const burnScenario = useMemo(
    () => runBurndown(debts, sliderExtra, strategy),
    [debts, sliderExtra, strategy]
  );

  const plan = strategy === "avalanche" ? planAvalanche : planSnowball;

  const change = (s: "avalanche" | "snowball") => {
    setStrategyState(s);
    startTransition(async () => {
      await setStrategy(s);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Choose Your Payoff Strategy</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <StrategyCard
            active={strategy === "avalanche"}
            onClick={() => change("avalanche")}
            icon={TrendingDown}
            title="Avalanche"
            body="Highest interest rate first. Saves the most money."
            stat={`${burnAvalanche.months} mo · ${fmtCurrency(burnAvalanche.totalInterest)} interest`}
          />
          <StrategyCard
            active={strategy === "snowball"}
            onClick={() => change("snowball")}
            icon={Snowflake}
            title="Snowball"
            body="Lowest balance first. Builds motivation with fast wins."
            stat={`${burnSnowball.months} mo · ${fmtCurrency(burnSnowball.totalInterest)} interest`}
          />
        </div>
        {isPending && (
          <div className="mt-3 text-[11px] text-[var(--muted-foreground)]">
            Updating strategy…
          </div>
        )}
      </Card>

      {plan.length > 0 && (
        <Card>
          <CardTitle>Payoff Order</CardTitle>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--muted-foreground)]">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 px-2 font-medium">Name</th>
                  <th className="py-2 px-2 font-medium">Type</th>
                  <th className="py-2 px-2 font-medium text-right">Balance</th>
                  <th className="py-2 px-2 font-medium text-right">APR</th>
                  <th className="py-2 px-2 font-medium text-right">Paid Off</th>
                  <th className="py-2 px-2 font-medium text-right">Interest</th>
                  <th className="py-2 pl-2 font-medium text-right">+Free / mo</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((d, i) => (
                  <tr
                    key={d.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="py-2 pr-2 text-[var(--muted-foreground)]">
                      {i + 1}
                    </td>
                    <td className="py-2 px-2 font-medium">{d.name}</td>
                    <td className="py-2 px-2">
                      <TypeBadge type={d.type} />
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {fmtCurrency(d.balance)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {fmtPct(d.interest_rate)}
                    </td>
                    <td className="py-2 px-2 text-right text-[var(--muted-foreground)]">
                      {d.monthPaidOff
                        ? fmtMonthYear(d.monthPaidOff)
                        : "—"}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {fmtCurrency(d.totalInterestPaid)}
                    </td>
                    <td className="py-2 pl-2 text-right font-mono text-[var(--teal)]">
                      +{fmtCurrency(d.monthlyFreeAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>What if you applied more?</CardTitle>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <label
              htmlFor="slider"
              className="text-xs text-[var(--muted-foreground)]"
            >
              Extra payment / mo
            </label>
            <span className="font-mono text-sm">
              {fmtCurrency(sliderExtra)}
            </span>
          </div>
          <input
            id="slider"
            type="range"
            min={0}
            max={maxSlider}
            step={25}
            value={sliderExtra}
            onChange={(e) => setSliderExtra(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Cell
              label="Payoff date"
              value={
                burnScenario.months >= 360
                  ? "30+ yrs"
                  : fmtMonthYear(burnScenario.months)
              }
            />
            <Cell
              label="Interest saved vs min-only"
              value={fmtCurrency(
                Math.max(0, burnMinOnly.totalInterest - burnScenario.totalInterest)
              )}
            />
            <Cell
              label="Months saved vs min-only"
              value={`${Math.max(
                0,
                burnMinOnly.months - burnScenario.months
              )} mo`}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Also Consider</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <Consideration
            icon={Building2}
            iconColor="var(--teal)"
            title="Emergency buffer"
            body={`Keep 3–6 months of business expenses (${fmtCurrency(bizExpensesTotal * 3)}–${fmtCurrency(bizExpensesTotal * 6)}) liquid before aggressive paydown.`}
          />
          <Consideration
            icon={ReceiptText}
            iconColor="var(--amber)"
            title="Business debt deductions"
            body="Interest on business debt may be tax-deductible — a 20% APR card could effectively cost ~16% after deduction."
          />
          <Consideration
            icon={CalendarClock}
            iconColor="var(--coral)"
            title="Quarterly taxes"
            body="Reserve SE + income tax before extras. Missing estimates creates new debt."
          />
          <Consideration
            icon={ArrowLeftRight}
            iconColor="var(--teal)"
            title="Refinancing"
            body="Any debt above 18% APR is a candidate for balance transfer or refi. Rate reduction beats raw extra payments."
          />
        </div>
      </Card>
    </div>
  );
}

function StrategyCard({
  active,
  onClick,
  icon: Icon,
  title,
  body,
  stat,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof TrendingDown;
  title: string;
  body: string;
  stat: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-lg border p-3 transition-colors",
        active
          ? "border-[var(--teal)] ring-1 ring-[var(--teal)]/30 bg-[var(--teal-bg)]/40"
          : "border-[var(--border)] hover:bg-[var(--muted)]"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon size={14} />
        {title}
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{body}</p>
      <div className="mt-2 text-[11px] font-mono text-[var(--muted-foreground)]">
        {stat}
      </div>
    </button>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--muted)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-medium">{value}</div>
    </div>
  );
}

function Consideration({
  icon: Icon,
  iconColor,
  title,
  body,
}: {
  icon: typeof Building2;
  iconColor: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md bg-[var(--muted)] p-3">
      <div className="flex items-center gap-2 font-medium text-[12px]">
        <Icon size={14} style={{ color: iconColor }} />
        {title}
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{body}</p>
    </div>
  );
}
