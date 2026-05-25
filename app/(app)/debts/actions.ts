"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS_TO_REVAL = ["/", "/debts", "/strategy", "/house-goal", "/income"];

function reval() {
  PATHS_TO_REVAL.forEach((p) => revalidatePath(p));
}

function parseDay(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > 31) return null;
  return n;
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
  const limitRaw = String(formData.get("credit_limit") ?? "").trim();
  const credit_limit =
    limitRaw && Number.isFinite(parseFloat(limitRaw))
      ? parseFloat(limitRaw)
      : null;
  const due_day = parseDay(formData.get("due_day"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const rawUrl = String(formData.get("payment_url") ?? "").trim();
  const payment_url = rawUrl
    ? /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`
    : null;
  const is_auto_pay = String(formData.get("is_auto_pay") ?? "") === "on";
  const rewardsDescRaw = String(formData.get("rewards_description") ?? "").trim();
  const rewards_description = rewardsDescRaw || null;
  const rewardsBalRaw = String(formData.get("rewards_balance") ?? "").trim();
  const rewards_balance =
    rewardsBalRaw && Number.isFinite(parseFloat(rewardsBalRaw))
      ? parseFloat(rewardsBalRaw)
      : 0;

  if (!name) throw new Error("Name is required");

  if (id) {
    const { error } = await supabase
      .from("debts")
      .update({
        name,
        type,
        balance,
        interest_rate,
        min_payment,
        original_balance,
        credit_limit,
        due_day,
        payment_url,
        is_auto_pay,
        rewards_description,
        rewards_balance,
        notes,
        is_paid_off: balance <= 0.01,
        paid_off_at: balance <= 0.01 ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[debts] update failed:", error.message);
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("debts").insert({
      user_id: user.id,
      name,
      type,
      balance,
      interest_rate,
      min_payment,
      original_balance: original_balance ?? balance,
      credit_limit,
      due_day,
      payment_url,
      is_auto_pay,
      rewards_description,
      rewards_balance,
      notes,
    });
    if (error) {
      console.error("[debts] insert failed:", error.message);
      throw new Error(error.message);
    }
  }
  reval();
}

export async function deleteDebt(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("debts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[debts] delete failed:", error.message);
    throw new Error(error.message);
  }
  reval();
}
