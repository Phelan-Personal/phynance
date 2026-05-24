import { requireUser } from "@/lib/auth";
import type { Expense, ExpenseHistory, Project } from "@/types";
import { ExpensesTabs } from "@/components/expenses/ExpensesTabs";

export default async function ExpensesPage() {
  const { user, supabase } = await requireUser();
  const [
    { data: expenses },
    { data: history },
    { data: projects },
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("amount", { ascending: false }),
    supabase.from("expense_history").select("*").eq("user_id", user.id),
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("is_archived", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Expenses</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Recurring fixed costs for business and personal life.
        </p>
      </div>
      <ExpensesTabs
        expenses={(expenses ?? []) as Expense[]}
        history={(history ?? []) as ExpenseHistory[]}
        projects={(projects ?? []) as Project[]}
      />
    </div>
  );
}
