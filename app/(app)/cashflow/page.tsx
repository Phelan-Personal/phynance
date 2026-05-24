import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/data";
import type {
  Debt,
  Expense,
  ExpenseTransaction,
  IncomeHistory,
  IncomeStream,
} from "@/types";
import { CashflowMonthView } from "@/components/cashflow/CashflowMonthView";

export default async function CashflowPage() {
  const { user, supabase } = await requireUser();
  const [
    { data: debtsData },
    { data: expensesData },
    { data: streamsData },
    { data: historyData },
    { data: transactionsData },
    settings,
  ] = await Promise.all([
    supabase.from("debts").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("income_streams").select("*").eq("user_id", user.id),
    supabase.from("income_history").select("*").eq("user_id", user.id),
    supabase.from("expense_transactions").select("*").eq("user_id", user.id),
    getOrCreateSettings(),
  ]);

  const debts = (debtsData ?? []) as Debt[];
  const expenses = (expensesData ?? []) as Expense[];
  const streams = (streamsData ?? []) as IncomeStream[];
  const history = (historyData ?? []) as IncomeHistory[];
  const transactions = (transactionsData ?? []) as ExpenseTransaction[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Cashflow</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Day-by-day for the month: when money hits, when bills clear, and the
          lowest point your balance reaches.
        </p>
      </div>
      <CashflowMonthView
        startingBalance={Number(settings.cash_on_hand) || 0}
        streams={streams}
        expenses={expenses}
        debts={debts}
        transactions={transactions}
        loggedIncome={history}
      />
    </div>
  );
}
