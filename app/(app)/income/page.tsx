import { requireUser } from "@/lib/auth";
import type {
  IncomeStream,
  IncomeHistory,
  Debt,
  Expense,
  ExpenseHistory,
  PendingPayment,
  RecurringRevenue,
} from "@/types";
import { getOrCreateSettings } from "@/lib/data";
import { IncomeStreamsList } from "@/components/income/IncomeStreamsList";
import { IncomeSettingsAndCashflow } from "@/components/income/IncomeSettingsAndCashflow";
import { IncomeHistoryGrid } from "@/components/income/IncomeHistoryGrid";
import { PendingPaymentsList } from "@/components/income/PendingPaymentsList";
import { IncomeTotalsCard } from "@/components/income/IncomeTotalsCard";
import { RecurringRevenueList } from "@/components/income/RecurringRevenueList";

export default async function IncomePage() {
  const { user, supabase } = await requireUser();

  const [
    { data: streamsData },
    { data: historyData },
    { data: debtsData },
    { data: expensesData },
    { data: expenseHistoryData },
    { data: pendingPaymentsData },
    { data: recurringRevenueData },
    settings,
  ] = await Promise.all([
    supabase
      .from("income_streams")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("income_history").select("*").eq("user_id", user.id),
    supabase.from("debts").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("expense_history").select("*").eq("user_id", user.id),
    supabase
      .from("pending_payments")
      .select("*")
      .eq("user_id", user.id)
      .order("expected_on", { ascending: true, nullsFirst: false }),
    supabase
      .from("recurring_revenue")
      .select("*")
      .eq("user_id", user.id)
      .order("due_day", { ascending: true, nullsFirst: false }),
    getOrCreateSettings(),
  ]);

  const streams = (streamsData ?? []) as IncomeStream[];
  const history = (historyData ?? []) as IncomeHistory[];
  const debts = (debtsData ?? []) as Debt[];
  const expenses = (expensesData ?? []) as Expense[];
  const expenseHistory = (expenseHistoryData ?? []) as ExpenseHistory[];
  const pendingPayments = (pendingPaymentsData ?? []) as PendingPayment[];
  const recurringRevenue =
    (recurringRevenueData ?? []) as RecurringRevenue[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Income & Cashflow</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Track every income stream and see what's actually available for debt
          payoff after taxes and obligations.
        </p>
      </div>

      <IncomeTotalsCard
        streams={streams}
        history={history}
        pendingPayments={pendingPayments}
      />

      <IncomeStreamsList streams={streams} history={history} />

      <RecurringRevenueList
        items={recurringRevenue}
        streams={streams}
      />

      <PendingPaymentsList payments={pendingPayments} streams={streams} />

      <IncomeSettingsAndCashflow
        settings={settings}
        streams={streams}
        debts={debts}
        expenses={expenses}
        expenseHistory={expenseHistory}
      />

      <IncomeHistoryGrid streams={streams} history={history} />
    </div>
  );
}
