import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/data";
import type {
  Asset,
  Debt,
  Expense,
  ExpenseHistory,
  Goal,
  IncomeStream,
} from "@/types";
import { monthlyAmortized } from "@/lib/expenses";
import { activeGrossMonthly } from "@/lib/streams";
import { GoalsPlanner } from "@/components/goals/GoalsPlanner";
import { upsertGoal, deleteGoal } from "./actions";

export default async function GoalsPage() {
  const { user, supabase } = await requireUser();
  const [
    { data: goalsData },
    { data: assetsData },
    { data: debtsData },
    { data: expensesData },
    { data: streamsData },
    { data: expenseHistoryData },
    settings,
  ] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("is_archived", { ascending: true })
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("assets").select("*").eq("user_id", user.id),
    supabase.from("debts").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("income_streams").select("*").eq("user_id", user.id),
    supabase.from("expense_history").select("*").eq("user_id", user.id),
    getOrCreateSettings(),
  ]);

  const goals = (goalsData ?? []) as Goal[];
  const assets = (assetsData ?? []) as Asset[];
  const debts = (debtsData ?? []) as Debt[];
  const expenses = (expensesData ?? []) as Expense[];
  const streams = (streamsData ?? []) as IncomeStream[];
  const expenseHistory = (expenseHistoryData ?? []) as ExpenseHistory[];

  const bizExpenses = expenses
    .filter((e) => e.type === "business")
    .reduce((a, e) => a + monthlyAmortized(e, expenseHistory), 0);
  const persExpenses = expenses
    .filter((e) => e.type === "personal")
    .reduce((a, e) => a + monthlyAmortized(e, expenseHistory), 0);
  const bizDebtMins = debts
    .filter((d) => d.type === "business" && !d.is_paid_off)
    .reduce((a, d) => a + Number(d.min_payment), 0);
  const persDebtMins = debts
    .filter((d) => d.type === "personal" && !d.is_paid_off)
    .reduce((a, d) => a + Number(d.min_payment), 0);
  const currentGross = activeGrossMonthly(streams);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Goals & Income Planner</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Set targets — retirement, emergency fund, savings, investments,
          extra debt payoff. We sum the monthly contribution each needs,
          fold in your existing obligations and taxes, and tell you the
          gross revenue you need to earn each month to fund all of it.
        </p>
      </div>
      <GoalsPlanner
        goals={goals}
        assets={assets}
        settings={settings}
        ctx={{
          currentGross,
          bizExpenses,
          persExpenses,
          bizDebtMins,
          persDebtMins,
        }}
        upsertGoal={upsertGoal}
        deleteGoal={deleteGoal}
      />
    </div>
  );
}
