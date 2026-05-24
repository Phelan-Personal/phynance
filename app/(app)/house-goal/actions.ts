"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/data";

const PATHS = ["/", "/house-goal"];

const numOrNull = (v: FormDataEntryValue | null): number | null => {
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const numOr0 = (v: FormDataEntryValue | null) => numOrNull(v) ?? 0;

export async function saveHouseGoal(formData: FormData) {
  const { user, supabase } = await requireUser();
  const update = {
    house_target_price: numOrNull(formData.get("house_target_price")),
    house_down_payment_pct: numOr0(formData.get("house_down_payment_pct")),
    house_current_savings: numOr0(formData.get("house_current_savings")),
    house_monthly_save: numOr0(formData.get("house_monthly_save")),
    house_mortgage_rate: numOr0(formData.get("house_mortgage_rate")),
    house_target_date:
      String(formData.get("house_target_date") ?? "").trim() || null,
  };
  const { data: existing } = await supabase
    .from("financial_settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("financial_settings")
      .update(update)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("financial_settings")
      .insert({ user_id: user.id, ...DEFAULT_SETTINGS, ...update });
  }
  PATHS.forEach((p) => revalidatePath(p));
}

export async function clearHouseGoal() {
  const { user, supabase } = await requireUser();
  await supabase
    .from("financial_settings")
    .update({ house_target_price: null, house_target_date: null })
    .eq("user_id", user.id);
  PATHS.forEach((p) => revalidatePath(p));
}
