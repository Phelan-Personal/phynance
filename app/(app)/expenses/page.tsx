import { requireUser } from "@/lib/auth";
import type { Expense } from "@/types";
import { ExpensesTabs } from "@/components/expenses/ExpensesTabs";

export default async function ExpensesPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .order("amount", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Expenses</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Recurring fixed costs for business and personal life.
        </p>
      </div>
      <ExpensesTabs expenses={(data ?? []) as Expense[]} />
    </div>
  );
}
