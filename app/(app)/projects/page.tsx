import Link from "next/link";
import { requireUser } from "@/lib/auth";
import type {
  Expense,
  ExpenseHistory,
  ExpenseTransaction,
  Project,
} from "@/types";
import { ProjectsList } from "@/components/projects/ProjectsList";

export default async function ProjectsPage() {
  const { user, supabase } = await requireUser();
  const [
    { data: projects },
    { data: expenses },
    { data: history },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("is_archived", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("expenses").select("*").eq("user_id", user.id),
    supabase.from("expense_history").select("*").eq("user_id", user.id),
    supabase
      .from("expense_transactions")
      .select("*")
      .eq("user_id", user.id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Tag recurring expenses, variable expenses (like payroll), and
          imported transactions to projects to see per-project totals. Use
          one project per row — split a person across projects by creating
          multiple variable expenses (e.g. "Sarah – Project A", "Sarah –
          Project B").
        </p>
      </div>
      <ProjectsList
        projects={(projects ?? []) as Project[]}
        expenses={(expenses ?? []) as Expense[]}
        history={(history ?? []) as ExpenseHistory[]}
        transactions={(transactions ?? []) as ExpenseTransaction[]}
      />
      <p className="text-[11px] text-[var(--muted-foreground)]">
        Pro tip: keep project names short — they show up as colored chips on
        every expense and transaction row.{" "}
        <Link href="/expenses" className="text-[var(--teal)] hover:underline">
          Go to /expenses
        </Link>{" "}
        to start tagging.
      </p>
    </div>
  );
}
