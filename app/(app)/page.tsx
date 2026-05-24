import Link from "next/link";
import {
  AlertTriangle,
  PiggyBank,
  Home as HomeIcon,
  ShieldAlert,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/data";
import type {
  Debt,
  Expense,
  IncomeStream,
  FinancialSettings,
} from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  calcAutoExtra,
  calcDTI,
  incomeNeededForGoal,
  runBurndown,
  type CalcDebt,
} from "@/lib/calculations";
import {
  cn,
  fmtCurrency,
  fmtMonthYear,
  fmtPct,
} from "@/lib/utils";
import { BurndownChart } from "@/components/dashboard/BurndownChart";

function toCalcDebts(debts: Debt[]): CalcDebt[] {
  return debts
    .filter((d) => !d.is_paid_off)
    .map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      balance: Number(d.balance),
      interest_rate: Number(d.interest_rate),
      min_payment: Number(d.min_payment),
    }));
}

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();
  const [
    { data: debtsData },
    { data: expensesData },
    { data: streamsData },
    settings,
  ] = await Promise.all([
    supabase.from("debts").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("income_streams").select("*").eq("user_id", user.id),
    getOrCreateSettings(),
  ]);

  const debts = (debtsData ?? []) as Debt[];
  const expenses = (expensesData ?? []) as Expense[];
  const streams = (streamsData ?? []) as IncomeStream[];

  const grossMonthly = streams.reduce(
    (a, s) => a + Number(s.avg_monthly || 0),
    0
  );
  const bizExpenses = expenses
    .filter((e) => e.type === "business")
    .reduce((a, e) => a + Number(e.amount), 0);
  const persExpenses = expenses
    .filter((e) => e.type === "personal")
    .reduce((a, e) => a + Number(e.amount), 0);
  const calcDebts = toCalcDebts(debts);
  const bizDebtMins = calcDebts
    .filter((d) => d.type === "business")
    .reduce((a, d) => a + d.min_payment, 0);
  const persDebtMins = calcDebts
    .filter((d) => d.type === "personal")
    .reduce((a, d) => a + d.min_payment, 0);

  const totalDebt = calcDebts.reduce((a, d) => a + d.balance, 0);
  const totalMins = calcDebts.reduce((a, d) => a + d.min_payment, 0);

  const autoExtra = calcAutoExtra({
    grossMonthly,
    draw: Number(settings.personal_draw),
    seTaxRate: Number(settings.se_tax_rate),
    incomeTaxRate: Number(settings.income_tax_rate),
    bizExpenses,
    persExpenses,
    bizDebtMins,
    persDebtMins,
  });
  const effectiveExtra =
    settings.extra_payment_override !== null
      ? Number(settings.extra_payment_override)
      : autoExtra;

  const minRun = runBurndown(
    calcDebts,
    0,
    settings.payoff_strategy,
    true
  );
  const stratRun = runBurndown(
    calcDebts,
    effectiveExtra,
    settings.payoff_strategy
  );
  const saved = minRun.totalInterest - stratRun.totalInterest;
  const monthsSaved = minRun.months - stratRun.months;

  const highApr = calcDebts.find((d) => d.interest_rate > 20);

  const dti = calcDTI(totalMins, grossMonthly);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Where your money lands, where your debt is going, and what would
          change if you pushed harder.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard
          label="Total Debt"
          value={fmtCurrency(totalDebt)}
          sub={`${calcDebts.length} account${calcDebts.length === 1 ? "" : "s"}`}
          tone={
            totalDebt > 50000 ? "bad" : totalDebt > 10000 ? "warn" : "good"
          }
        />
        <MetricCard
          label="Monthly Minimums"
          value={fmtCurrency(totalMins)}
          sub="required floor"
        />
        <MetricCard
          label="Extra Available"
          value={fmtCurrency(effectiveExtra)}
          sub={
            settings.extra_payment_override !== null ? "manual" : "auto-calc"
          }
          tone={effectiveExtra > 0 ? "good" : "bad"}
        />
        <MetricCard
          label="Debt-Free Date"
          value={
            !calcDebts.length
              ? "—"
              : stratRun.months >= 360
                ? "30+ yrs"
                : fmtMonthYear(stratRun.months)
          }
          sub={
            !calcDebts.length
              ? "add debts"
              : stratRun.months < 360
                ? `${stratRun.months} months`
                : "raise payment"
          }
        />
      </div>

      {/* Alerts */}
      {totalDebt > 0 && effectiveExtra <= 0 && (
        <Alert
          tone="warn"
          icon={AlertTriangle}
          text={`Your income after taxes, expenses, and minimums leaves ${fmtCurrency(
            effectiveExtra
          )} for extra payments. Check Income or Expenses.`}
        />
      )}
      {highApr && (
        <Alert
          tone="bad"
          icon={ShieldAlert}
          text={`You have high-rate debt (${fmtPct(
            highApr.interest_rate
          )} on ${highApr.name}). Consider balance transfer or refinancing before anything else.`}
        />
      )}
      {effectiveExtra > 0 && saved > 500 && (
        <Alert
          tone="good"
          icon={PiggyBank}
          text={`Your ${settings.payoff_strategy} strategy saves ${fmtCurrency(
            saved
          )} in interest and gets you debt-free ${monthsSaved} months sooner.`}
        />
      )}
      {settings.house_target_price && dti > 43 && (
        <Alert
          tone="bad"
          icon={HomeIcon}
          text={`Your DTI (${fmtPct(
            dti
          )}) is above the 43% lending threshold. Pay off debt before applying for a mortgage.`}
        />
      )}

      {/* Burndown chart */}
      <Card>
        <CardTitle>Debt Burndown Projection</CardTitle>
        {!calcDebts.length ? (
          <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            Add debts on the{" "}
            <Link className="text-[var(--teal)] underline" href="/debts">
              Debts
            </Link>{" "}
            page to see the projection.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-4"
                  style={{ borderTop: "1.5px dashed #B4B2A9" }}
                />
                Min only
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-4"
                  style={{ borderTop: "2px solid #1D9E75" }}
                />
                With strategy
              </span>
            </div>
            <BurndownChart
              minOnly={minRun.history}
              strategy={stratRun.history}
            />
          </>
        )}
      </Card>

      {/* Income Needed table */}
      <Card>
        <CardTitle>Income Needed to Hit Each Payoff Goal</CardTitle>
        {!calcDebts.length ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No debts to project.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--muted-foreground)] text-left">
                  <th className="py-2 pr-3 font-medium">Goal</th>
                  <th className="py-2 px-3 font-medium">Extra / Mo</th>
                  <th className="py-2 px-3 font-medium">Gross Revenue Needed</th>
                  <th className="py-2 px-3 font-medium">Date</th>
                  <th className="py-2 pl-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[12, 24, 36, 48, 60].map((g) => {
                  const { grossNeeded, extraNeeded } = incomeNeededForGoal({
                    debts: calcDebts,
                    goalMonths: g,
                    strategy: settings.payoff_strategy,
                    bizExpenses,
                    persExpenses,
                    bizDebtMins,
                    persDebtMins,
                    draw: Number(settings.personal_draw),
                    seTaxRate: Number(settings.se_tax_rate),
                    incomeTaxRate: Number(settings.income_tax_rate),
                  });
                  const ok = grossNeeded <= grossMonthly && grossMonthly > 0;
                  return (
                    <tr
                      key={g}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="py-2 pr-3">{g} mo</td>
                      <td className="py-2 px-3 font-mono">
                        {fmtCurrency(extraNeeded)}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-3 font-mono",
                          ok ? "text-[var(--teal)]" : "text-[var(--coral)]"
                        )}
                      >
                        {fmtCurrency(grossNeeded)}
                      </td>
                      <td className="py-2 px-3 text-[var(--muted-foreground)]">
                        {fmtMonthYear(g)}
                      </td>
                      <td className="py-2 pl-3">
                        {grossMonthly === 0 ? (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        ) : ok ? (
                          <span className="text-[var(--teal)]">✓</span>
                        ) : (
                          <span className="text-[var(--coral)]">✗</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">
              Gross needed accounts for SE tax ({fmtPct(Number(settings.se_tax_rate))}),
              income tax ({fmtPct(Number(settings.income_tax_rate))}), expenses,
              draw, and required extra payments.
            </p>
          </div>
        )}
      </Card>

      {/* House goal widget */}
      {settings.house_target_price && (
        <HouseGoalWidget
          settings={settings}
          dti={dti}
          grossMonthly={grossMonthly}
        />
      )}
    </div>
  );
}

function MetricCard({
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
  const valueCls =
    tone === "good"
      ? "text-[var(--teal)]"
      : tone === "warn"
        ? "text-[var(--amber)]"
        : tone === "bad"
          ? "text-[var(--coral)]"
          : "";
  return (
    <div className="rounded-md bg-[var(--muted)] px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-lg font-medium", valueCls)}>
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
          {sub}
        </div>
      )}
    </div>
  );
}

function Alert({
  tone,
  icon: Icon,
  text,
}: {
  tone: "good" | "warn" | "bad";
  icon: typeof AlertTriangle;
  text: string;
}) {
  const styles = {
    good: "bg-[var(--teal-bg)] border-[color:var(--teal)]/30 text-[var(--teal-dark)]",
    warn: "bg-[var(--amber-bg)] border-[color:var(--amber)]/30 text-[var(--amber)]",
    bad: "bg-[var(--coral-bg)] border-[color:var(--coral)]/30 text-[var(--coral)]",
  }[tone];
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2 text-xs",
        styles
      )}
    >
      <Icon size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

function HouseGoalWidget({
  settings,
  dti,
  grossMonthly,
}: {
  settings: FinancialSettings;
  dti: number;
  grossMonthly: number;
}) {
  const target = Number(settings.house_target_price);
  const pct = Number(settings.house_down_payment_pct);
  const current = Number(settings.house_current_savings);
  const monthlySave = Number(settings.house_monthly_save);
  const needed = target * (pct / 100);
  const progressPct = needed > 0 ? Math.min(100, (current / needed) * 100) : 0;
  const monthsToGo =
    monthlySave > 0
      ? Math.ceil(Math.max(0, needed - current) / monthlySave)
      : Infinity;

  return (
    <Card>
      <CardTitle
        right={
          <Link
            href="/house-goal"
            className="text-xs text-[var(--teal)] hover:underline"
          >
            Go to house goal →
          </Link>
        }
      >
        House Goal
      </CardTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Down payment progress
          </div>
          <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
            <div
              className="h-full bg-[var(--teal)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-[var(--muted-foreground)]">
            <span className="font-mono">{fmtCurrency(current)}</span> /{" "}
            <span className="font-mono">{fmtCurrency(needed)}</span> ({fmtPct(progressPct)})
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Months to down payment
          </div>
          <div className="font-mono text-lg font-medium">
            {Number.isFinite(monthsToGo) ? monthsToGo : "—"}
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">
            {Number.isFinite(monthsToGo)
              ? `Ready around ${fmtMonthYear(monthsToGo)}`
              : "Set a monthly savings amount"}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Current DTI
          </div>
          <div
            className={cn(
              "font-mono text-lg font-medium",
              dti < 36
                ? "text-[var(--teal)]"
                : dti <= 43
                  ? "text-[var(--amber)]"
                  : "text-[var(--coral)]"
            )}
          >
            {grossMonthly > 0 ? fmtPct(dti) : "—"}
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">
            Lender hard cap is 43%, preferred under 36%
          </div>
        </div>
      </div>
    </Card>
  );
}
