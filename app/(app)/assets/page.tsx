import { requireUser } from "@/lib/auth";
import type { Asset } from "@/types";
import { AssetsList } from "@/components/assets/AssetsList";

export default async function AssetsPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("type", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Assets</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Savings, crypto, and stock holdings. Track units × price per unit;
          live prices coming later.
        </p>
      </div>
      <AssetsList assets={(data ?? []) as Asset[]} />
    </div>
  );
}
