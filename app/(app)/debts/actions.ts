"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS_TO_REVAL = ["/", "/debts", "/strategy", "/house-goal", "/income"];

function reval() {
  PATHS_TO_REVAL.forEach((p) => revalidatePath(p));
}

export async function upsertDebt(formData: FormData) {
  const { user, supabase } = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "personal");
  const balance = parseFloat(String(formData.get("balance") ?? "0")) || 0;
  const interest_rate =
    parseFloat(String(formData.get("interest_rate") ?? "0")) || 0;
  const min_payment =
    parseFloat(String(formData.get("min_payment") ?? "0")) || 0;
  const originalRaw = String(formData.get("original_balance") ?? "").trim();
  const original_balance = originalRaw ? parseFloat(originalRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return;

  if (id) {
    await supabase
      .from("debts")
      .update({
        name,
        type,
        balance,
        interest_rate,
        min_payment,
        original_balance,
        notes,
        is_paid_off: balance <= 0.01,
        paid_off_at: balance <= 0.01 ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("debts").insert({
      user_id: user.id,
      name,
      type,
      balance,
      interest_rate,
      min_payment,
      original_balance: original_balance ?? balance,
      notes,
    });
  }
  reval();
}

export async function deleteDebt(id: string) {
  const { user, supabase } = await requireUser();
  await supabase.from("debts").delete().eq("id", id).eq("user_id", user.id);
  reval();
}
