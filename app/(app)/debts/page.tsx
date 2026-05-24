import { requireUser } from "@/lib/auth";
import type { Debt } from "@/types";
import { DebtList } from "@/components/debts/DebtList";

export default async function DebtsPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
    .order("balance", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Debts</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Track every account you owe. Sort by interest rate to attack the
          costliest first.
        </p>
      </div>
      <DebtList debts={(data ?? []) as Debt[]} />
    </div>
  );
}
