import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/data";
import type { Debt, Expense, ExpenseHistory, IncomeStream } from "@/types";
import { calcAutoExtra, type CalcDebt } from "@/lib/calculations";
import { monthlyAmortized } from "@/lib/expenses";
import { activeGrossMonthly } from "@/lib/streams";
import { StrategyClient } from "@/components/strategy/StrategyClient";

export default async function StrategyPage() {
  const { user, supabase } = await requireUser();
  const [
    { data: debtsData },
    { data: expensesData },
    { data: streamsData },
    { data: expenseHistoryData },
    settings,
  ] = await Promise.all([
    supabase.from("debts").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("income_streams").select("*").eq("user_id", user.id),
    supabase.from("expense_history").select("*").eq("user_id", user.id),
    getOrCreateSettings(),
  ]);

  const debts = (debtsData ?? []) as Debt[];
  const expenses = (expensesData ?? []) as Expense[];
  const streams = (streamsData ?? []) as IncomeStream[];
  const expenseHistory = (expenseHistoryData ?? []) as ExpenseHistory[];

  const calcDebts: CalcDebt[] = debts
    .filter((d) => !d.is_paid_off)
    .map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      balance: Number(d.balance),
      interest_rate: Number(d.interest_rate),
      min_payment: Number(d.min_payment),
    }));

  const grossMonthly = activeGrossMonthly(streams);
  const bizExpensesTotal = expenses
    .filter((e) => e.type === "business")
    .reduce((a, e) => a + monthlyAmortized(e, expenseHistory), 0);
  const persExpensesTotal = expenses
    .filter((e) => e.type === "personal")
    .reduce((a, e) => a + monthlyAmortized(e, expenseHistory), 0);
  const bizDebtMins = calcDebts
    .filter((d) => d.type === "business")
    .reduce((a, d) => a + d.min_payment, 0);
  const persDebtMins = calcDebts
    .filter((d) => d.type === "personal")
    .reduce((a, d) => a + d.min_payment, 0);

  const autoExtra = calcAutoExtra({
    grossMonthly,
    draw: Number(settings.personal_draw),
    seTaxRate: Number(settings.se_tax_rate),
    incomeTaxRate: Number(settings.income_tax_rate),
    bizExpenses: bizExpensesTotal,
    persExpenses: persExpensesTotal,
    bizDebtMins,
    persDebtMins,
  });
  const effectiveExtra =
    settings.extra_payment_override !== null
      ? Number(settings.extra_payment_override)
      : autoExtra;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Strategy</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Pick a payoff method and see exactly when each debt clears.
        </p>
      </div>
      <StrategyClient
        debts={calcDebts}
        initialStrategy={settings.payoff_strategy}
        autoExtra={effectiveExtra}
        bizExpensesTotal={bizExpensesTotal}
      />
    </div>
  );
}
