"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  calcDownPaymentMonths,
  calcDTI,
  calcMonthlyMortgage,
  getPayoffPlan,
  type CalcDebt,
} from "@/lib/calculations";
import {
  cn,
  dtiColor,
  fmtCurrency,
  fmtMonthYear,
  fmtPct,
} from "@/lib/utils";
import type { FinancialSettings } from "@/types";

export function HouseGoalDashboard({
  settings,
  debts,
  grossMonthly,
  totalDebtMins,
  effectiveExtra,
  revenueTrend,
  onEdit,
}: {
  settings: FinancialSettings;
  debts: CalcDebt[];
  grossMonthly: number;
  totalDebtMins: number;
  effectiveExtra: number;
  revenueTrend: "up" | "down" | "flat";
  onEdit: () => void;
}) {
  const target = Number(settings.house_target_price ?? 0);
  const pct = Number(settings.house_down_payment_pct);
  const current = Number(settings.house_current_savings);
  const monthlySave = Number(settings.house_monthly_save);
  const mortgageRate = Number(settings.house_mortgage_rate);

  const needed = target * (pct / 100);
  const monthsToGoal = calcDownPaymentMonths(target, pct, current, monthlySave);
  const progressPct = needed > 0 ? Math.min(100, (current / needed) * 100) : 0;
  const remaining = Math.max(0, needed - current);
  const monthlyToHit6Sooner =
    Number.isFinite(monthsToGoal) && monthsToGoal > 6
      ? remaining / Math.max(1, monthsToGoal - 6) - monthlySave
      : 0;
  const monthlyToHit12Sooner =
    Number.isFinite(monthsToGoal) && monthsToGoal > 12
      ? remaining / Math.max(1, monthsToGoal - 12) - monthlySave
      : 0;

  const loanAmount = target - needed;
  const monthlyPI = calcMonthlyMortgage(loanAmount, mortgageRate, 30);
  const monthlyTaxIns = (target * 0.012) / 12;
  const monthlyTotal = monthlyPI + monthlyTaxIns;

  const currentDTI = calcDTI(totalDebtMins, grossMonthly);
  const dtiWithMortgage = calcDTI(totalDebtMins + monthlyPI, grossMonthly);

  const plan = useMemo(
    () => getPayoffPlan(debts, effectiveExtra, settings.payoff_strategy),
    [debts, effectiveExtra, settings.payoff_strategy]
  );

  const futureDTI = grossMonthly > 0 ? 0 : 0;

  const [check, setCheck] = useState({
    emergency: false,
    credit: false,
    selfEmployed2yr: false,
  });

  const ready43 = currentDTI <= 43;
  const ready36 = currentDTI <= 36;
  const dpReady = current >= needed;

  const payoffImpact = useMemo(() => {
    let runningMins = totalDebtMins;
    const rows: {
      label: string;
      dti: number;
      withMortgage: number;
      ready: boolean;
    }[] = [
      {
        label: "Current",
        dti: currentDTI,
        withMortgage: dtiWithMortgage,
        ready: currentDTI <= 43,
      },
    ];
    for (const d of plan) {
      runningMins -= d.min_payment;
      const dti = calcDTI(Math.max(0, runningMins), grossMonthly);
      rows.push({
        label: `After ${d.name} paid off`,
        dti,
        withMortgage: calcDTI(
          Math.max(0, runningMins) + monthlyPI,
          grossMonthly
        ),
        ready: dti <= 43,
      });
    }
    return rows;
  }, [plan, totalDebtMins, grossMonthly, currentDTI, dtiWithMortgage, monthlyPI]);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          right={
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit goal
            </Button>
          }
        >
          Down Payment Progress
        </CardTitle>
        <div className="space-y-3">
          <div className="h-3 rounded-full bg-[var(--muted)] overflow-hidden">
            <div
              className="h-full bg-[var(--teal)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-mono">
              {fmtCurrency(current)} of {fmtCurrency(needed)}
            </span>
            <span className="text-[var(--muted-foreground)]">
              {fmtPct(progressPct)}
            </span>
          </div>
          <div className="text-sm">
            {monthlySave > 0 && Number.isFinite(monthsToGoal) ? (
              <>
                At <span className="font-mono">{fmtCurrency(monthlySave)}</span>/mo,
                you'll reach your down payment in{" "}
                <span className="font-medium">{monthsToGoal} months</span> (
                {fmtMonthYear(monthsToGoal)}).
              </>
            ) : (
              <span className="text-[var(--muted-foreground)]">
                Set a monthly savings amount to see your timeline.
              </span>
            )}
          </div>
          {monthlyToHit6Sooner > 0 && (
            <div className="text-[11px] text-[var(--muted-foreground)]">
              Hit it 6 months sooner: save{" "}
              <span className="font-mono">+{fmtCurrency(monthlyToHit6Sooner)}</span>
              /mo.
              {monthlyToHit12Sooner > 0 && (
                <>
                  {" "}12 months sooner:{" "}
                  <span className="font-mono">+{fmtCurrency(monthlyToHit12Sooner)}</span>
                  /mo.
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Estimated Mortgage</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Cell label="Loan amount" value={fmtCurrency(loanAmount)} />
          <Cell label="Rate" value={fmtPct(mortgageRate)} />
          <Cell label="Monthly P&I" value={fmtCurrency(monthlyPI)} />
          <Cell
            label="Monthly total (PITI est.)"
            value={fmtCurrency(monthlyTotal)}
            sub="adds 1.2% / yr for taxes + ins."
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Debt-to-Income</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DTIGauge label="Current" value={currentDTI} grossMonthly={grossMonthly} />
          <DTIGauge
            label="With new mortgage"
            value={dtiWithMortgage}
            grossMonthly={grossMonthly}
          />
          <DTIGauge
            label="After all debts paid off"
            value={futureDTI}
            grossMonthly={grossMonthly}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Mortgage Readiness Checklist</CardTitle>
        <ul className="space-y-1.5 text-sm">
          <Auto title="DTI under 43%" ok={ready43} />
          <Auto title="DTI under 36% (preferred)" ok={ready36} />
          <Auto
            title="Down payment saved"
            ok={dpReady}
            detail={dpReady ? undefined : `${fmtPct(progressPct)} there`}
          />
          <Manual
            checked={check.emergency}
            onChange={(v) => setCheck((c) => ({ ...c, emergency: v }))}
            title="3–6 months emergency fund"
          />
          <Manual
            checked={check.credit}
            onChange={(v) => setCheck((c) => ({ ...c, credit: v }))}
            title="Credit score 680+"
          />
          <Manual
            checked={check.selfEmployed2yr}
            onChange={(v) => setCheck((c) => ({ ...c, selfEmployed2yr: v }))}
            title="2 years of self-employment income documented"
          />
          <Auto
            title="Business revenue trending up or stable"
            ok={revenueTrend !== "down"}
            detail={
              revenueTrend === "up"
                ? "trending up"
                : revenueTrend === "down"
                  ? "trending down — log recent months"
                  : "stable / no history"
            }
          />
        </ul>
      </Card>

      {plan.length > 0 && grossMonthly > 0 && (
        <Card>
          <CardTitle>Impact of Paying Off Debts</CardTitle>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--muted-foreground)]">
                  <th className="py-2 pr-3 font-medium">When you pay off</th>
                  <th className="py-2 px-3 font-medium text-right">DTI</th>
                  <th className="py-2 px-3 font-medium text-right">
                    DTI w/ new mortgage
                  </th>
                  <th className="py-2 pl-3 font-medium">Mortgage readiness</th>
                </tr>
              </thead>
              <tbody>
                {payoffImpact.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="py-2 pr-3">{row.label}</td>
                    <td
                      className={cn(
                        "py-2 px-3 text-right font-mono",
                        dtiColor(row.dti)
                      )}
                    >
                      {fmtPct(row.dti)}
                    </td>
                    <td
                      className={cn(
                        "py-2 px-3 text-right font-mono",
                        dtiColor(row.withMortgage)
                      )}
                    >
                      {fmtPct(row.withMortgage)}
                    </td>
                    <td className="py-2 pl-3">
                      {row.ready ? (
                        <span className="text-[var(--teal)]">
                          ✓ Under 43%
                        </span>
                      ) : (
                        <span className="text-[var(--coral)]">✗ Not ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md bg-[var(--muted)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-medium">{value}</div>
      {sub && (
        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}

function DTIGauge({
  label,
  value,
  grossMonthly,
}: {
  label: string;
  value: number;
  grossMonthly: number;
}) {
  const pct = Math.min(100, value);
  const cls = dtiColor(value);
  return (
    <div className="rounded-md bg-[var(--muted)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-lg font-medium", cls)}>
        {grossMonthly > 0 ? fmtPct(value) : "—"}
      </div>
      <div className="mt-2 h-2 rounded-full bg-[var(--background)] overflow-hidden border border-[var(--border)]">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background:
              value < 36
                ? "var(--teal)"
                : value <= 43
                  ? "var(--amber)"
                  : "var(--coral)",
          }}
        />
      </div>
      <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">
        green &lt;36% · amber 36–43 · red &gt;43
      </div>
    </div>
  );
}

function Auto({
  title,
  ok,
  detail,
}: {
  title: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded border text-[10px]",
          ok
            ? "border-[var(--teal)] text-[var(--teal)] bg-[var(--teal-bg)]"
            : "border-[var(--border)] text-[var(--muted-foreground)]"
        )}
      >
        {ok ? "✓" : ""}
      </span>
      <span className={cn(!ok && "text-[var(--muted-foreground)]")}>
        {title}
        {detail && (
          <span className="text-[var(--muted-foreground)] text-[11px] ml-1">
            ({detail})
          </span>
        )}
      </span>
    </li>
  );
}

function Manual({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="!w-4 !h-4"
      />
      <span className={cn(!checked && "text-[var(--muted-foreground)]")}>
        {title}
      </span>
    </li>
  );
}
