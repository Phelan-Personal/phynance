import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/data";
import type {
  Debt,
  Expense,
  IncomeStream,
  IncomeHistory,
} from "@/types";
import { calcAutoExtra, type CalcDebt } from "@/lib/calculations";
import { HouseGoalShell } from "@/components/house/HouseGoalShell";

function trend(history: IncomeHistory[]): "up" | "down" | "flat" {
  const monthly = new Map<string, number>();
  for (const h of history) {
    monthly.set(h.month, (monthly.get(h.month) ?? 0) + Number(h.amount));
  }
  const sorted = [...monthly.entries()].sort((a, b) =>
    b[0].localeCompare(a[0])
  );
  if (sorted.length < 3) return "flat";
  const last3 = sorted.slice(0, 3);
  const prev3 = sorted.slice(3, 6);
  if (prev3.length < 1) return "flat";
  const lastAvg = last3.reduce((a, [, v]) => a + v, 0) / last3.length;
  const prevAvg = prev3.reduce((a, [, v]) => a + v, 0) / prev3.length;
  if (lastAvg > prevAvg * 1.05) return "up";
  if (lastAvg < prevAvg * 0.95) return "down";
  return "flat";
}

export default async function HouseGoalPage() {
  const { user, supabase } = await requireUser();
  const [
    { data: debtsData },
    { data: expensesData },
    { data: streamsData },
    { data: historyData },
    settings,
  ] = await Promise.all([
    supabase.from("debts").select("*").eq("user_id", user.id),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("income_streams").select("*").eq("user_id", user.id),
    supabase.from("income_history").select("*").eq("user_id", user.id),
    getOrCreateSettings(),
  ]);

  const debts = (debtsData ?? []) as Debt[];
  const expenses = (expensesData ?? []) as Expense[];
  const streams = (streamsData ?? []) as IncomeStream[];
  const history = (historyData ?? []) as IncomeHistory[];

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

  const grossMonthly = streams.reduce(
    (a, s) => a + Number(s.avg_monthly || 0),
    0
  );
  const totalDebtMins = calcDebts.reduce((a, d) => a + d.min_payment, 0);
  const bizExpenses = expenses
    .filter((e) => e.type === "business")
    .reduce((a, e) => a + Number(e.amount), 0);
  const persExpenses = expenses
    .filter((e) => e.type === "personal")
    .reduce((a, e) => a + Number(e.amount), 0);
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
    bizExpenses,
    persExpenses,
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
        <h1 className="text-xl font-semibold">House Goal</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Track down payment progress, mortgage readiness, and DTI.
        </p>
      </div>
      <HouseGoalShell
        settings={settings}
        debts={calcDebts}
        grossMonthly={grossMonthly}
        totalDebtMins={totalDebtMins}
        effectiveExtra={effectiveExtra}
        revenueTrend={trend(history)}
      />
    </div>
  );
}
