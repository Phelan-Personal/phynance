import Link from "next/link";
import {
  AlertTriangle,
  PiggyBank,
  Home as HomeIcon,
  ShieldAlert,
  CalendarDays,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/data";
import type {
  Debt,
  Expense,
  ExpenseHistory,
  IncomeStream,
  IncomeHistory,
  ExpenseTransaction,
  Asset,
  PendingPayment,
  FinancialSettings,
} from "@/types";
import { assetValue } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { CashflowHistoryChart } from "@/components/dashboard/CashflowHistoryChart";
import {
  calcAutoExtra,
  calcDTI,
  incomeNeededForGoal,
  runBurndown,
  type CalcDebt,
} from "@/lib/calculations";
import {
  dailyBalances,
  daysInMonth,
  eventsForMonth,
  lowestPoint,
} from "@/lib/cashflow";
import { monthlyAmortized } from "@/lib/expenses";
import { activeGrossMonthly } from "@/lib/streams";
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
    { data: incomeHistoryData },
    { data: transactionsData },
    { data: assetsData },
    { data: expenseHistoryData },
    { data: pendingPaymentsData },
    settings,
  ] = await Promise.all([
    supabase.from("debts").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("income_streams").select("*").eq("user_id", user.id),
    supabase.from("income_history").select("*").eq("user_id", user.id),
    supabase
      .from("expense_transactions")
      .select("*")
      .eq("user_id", user.id),
    supabase.from("assets").select("*").eq("user_id", user.id),
    supabase.from("expense_history").select("*").eq("user_id", user.id),
    supabase.from("pending_payments").select("*").eq("user_id", user.id),
    getOrCreateSettings(),
  ]);

  const debts = (debtsData ?? []) as Debt[];
  const expenses = (expensesData ?? []) as Expense[];
  const streams = (streamsData ?? []) as IncomeStream[];
  const incomeHistory = (incomeHistoryData ?? []) as IncomeHistory[];
  const transactions = (transactionsData ?? []) as ExpenseTransaction[];
  const assets = (assetsData ?? []) as Asset[];
  const expenseHistory = (expenseHistoryData ?? []) as ExpenseHistory[];
  const pendingPayments = (pendingPaymentsData ?? []) as PendingPayment[];

  const grossMonthly = activeGrossMonthly(streams);
  const bizExpenses = expenses
    .filter((e) => e.type === "business")
    .reduce((a, e) => a + monthlyAmortized(e, expenseHistory), 0);
  const persExpenses = expenses
    .filter((e) => e.type === "personal")
    .reduce((a, e) => a + monthlyAmortized(e, expenseHistory), 0);
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

  // Cashflow danger detection for the current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const cashflowEvents = eventsForMonth({
    year: currentYear,
    monthIndex: currentMonthIndex,
    streams,
    expenses,
    debts,
    transactions,
    loggedIncome: incomeHistory,
    expenseHistory,
    pendingPayments,
  });

  const today = new Date().toISOString().slice(0, 10);
  const outstandingAR = pendingPayments
    .filter((p) => !p.received_on)
    .reduce((a, p) => a + Number(p.amount), 0);
  const overdueAR = pendingPayments
    .filter(
      (p) => !p.received_on && p.expected_on && p.expected_on < today
    )
    .reduce((a, p) => a + Number(p.amount), 0);
  const pendingCount = pendingPayments.filter((p) => !p.received_on).length;
  const cashOnHand = Number(settings.cash_on_hand) || 0;
  const cashflowPoints = dailyBalances(
    cashflowEvents,
    cashOnHand,
    daysInMonth(currentYear, currentMonthIndex)
  );
  const cashflowLow = lowestPoint(cashflowPoints);
  const monthName = new Date(
    currentYear,
    currentMonthIndex,
    1
  ).toLocaleDateString("en-US", { month: "long" });

  const totalAssets = assets.reduce((a, x) => a + assetValue(x), 0);

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
      {cashflowLow && cashflowLow.balance < 0 && (
        <Link
          href="/cashflow"
          className="block rounded-md border border-[color:var(--coral)]/40 bg-[var(--coral-bg)] px-3 py-2 text-xs text-[var(--coral)] hover:bg-[var(--coral-bg)]/80"
        >
          <div className="flex items-start gap-2.5">
            <CalendarDays size={14} className="mt-0.5 shrink-0" />
            <span>
              <strong>{monthName}:</strong> your balance bottoms out at{" "}
              <strong className="font-mono">{fmtCurrency(cashflowLow.balance)}</strong>{" "}
              on day <strong>{cashflowLow.day}</strong>. You need{" "}
              <strong className="font-mono">
                {fmtCurrency(Math.abs(cashflowLow.balance))}
              </strong>{" "}
              of bridge cash before then. <span className="underline">See /cashflow →</span>
            </span>
          </div>
        </Link>
      )}
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

      {/* Outstanding A/R */}
      {outstandingAR > 0 && (
        <Card>
          <CardTitle
            right={
              <Link
                href="/income"
                className="text-xs text-[var(--teal)] hover:underline"
              >
                Manage A/R →
              </Link>
            }
          >
            Accounts Receivable
          </CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <MetricCard
              label="Outstanding"
              value={fmtCurrency(outstandingAR)}
              sub={`${pendingCount} pending payment${pendingCount === 1 ? "" : "s"}`}
              tone="good"
            />
            {overdueAR > 0 && (
              <MetricCard
                label="Overdue"
                value={fmtCurrency(overdueAR)}
                sub="expected date passed — follow up"
                tone="bad"
              />
            )}
            <MetricCard
              label="Already collected"
              value={fmtCurrency(
                pendingPayments
                  .filter((p) => p.received_on)
                  .reduce((a, p) => a + Number(p.amount), 0)
              )}
              sub="total received to date"
            />
          </div>
        </Card>
      )}

      {/* Assets summary */}
      {assets.length > 0 && (
        <Card>
          <CardTitle
            right={
              <Link
                href="/assets"
                className="text-xs text-[var(--teal)] hover:underline"
              >
                Manage assets →
              </Link>
            }
          >
            Assets
          </CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MetricCard
              label="Total Assets"
              value={fmtCurrency(totalAssets)}
              sub={`${assets.length} item${assets.length === 1 ? "" : "s"}`}
              tone="good"
            />
            <MetricCard
              label="Savings"
              value={fmtCurrency(
                assets
                  .filter((a) => a.type === "savings")
                  .reduce((s, a) => s + assetValue(a), 0)
              )}
            />
            <MetricCard
              label="Crypto"
              value={fmtCurrency(
                assets
                  .filter((a) => a.type === "crypto")
                  .reduce((s, a) => s + assetValue(a), 0)
              )}
            />
            <MetricCard
              label="Stocks"
              value={fmtCurrency(
                assets
                  .filter((a) => a.type === "stock")
                  .reduce((s, a) => s + assetValue(a), 0)
              )}
            />
          </div>
        </Card>
      )}

      {/* Cashflow over time */}
      <Card>
        <CardTitle>Monthly Cashflow (last 12 months)</CardTitle>
        <CashflowHistoryChart
          income={incomeHistory}
          transactions={transactions}
          streams={streams}
          recurringMonthlyExpenseEstimate={bizExpenses + persExpenses}
          monthlyDebtMins={totalMins}
        />
        <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
          Income comes from logged monthly actuals on /income. Outflow
          includes dated transactions plus a flat estimate from your recurring
          expenses and debt minimums for each month.
        </p>
      </Card>

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
