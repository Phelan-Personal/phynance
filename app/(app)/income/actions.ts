"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/data";

const PATHS = ["/", "/income", "/strategy", "/house-goal"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

const numOrNull = (v: FormDataEntryValue | null): number | null => {
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const numOr0 = (v: FormDataEntryValue | null): number => numOrNull(v) ?? 0;

// ────────────────────────── Settings ──────────────────────────

export async function saveSettings(formData: FormData) {
  const { user, supabase } = await requireUser();

  const update = {
    personal_draw: numOr0(formData.get("personal_draw")),
    se_tax_rate: numOr0(formData.get("se_tax_rate")),
    income_tax_rate: numOr0(formData.get("income_tax_rate")),
    payoff_strategy: String(
      formData.get("payoff_strategy") ?? "avalanche"
    ) as "avalanche" | "snowball",
    extra_payment_override:
      String(formData.get("extra_payment_mode")) === "manual"
        ? numOr0(formData.get("extra_payment_override"))
        : null,
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
  reval();
}

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
  reval();
}

// ────────────────────────── Income Streams ──────────────────────────

export async function upsertStream(formData: FormData) {
  const { user, supabase } = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "business");
  const avg_monthly = numOr0(formData.get("avg_monthly"));
  const is_primary = String(formData.get("is_primary") ?? "") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!name) return;

  if (is_primary) {
    await supabase
      .from("income_streams")
      .update({ is_primary: false })
      .eq("user_id", user.id);
  }

  if (id) {
    await supabase
      .from("income_streams")
      .update({ name, type, avg_monthly, is_primary, notes })
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("income_streams").insert({
      user_id: user.id,
      name,
      type,
      avg_monthly,
      is_primary,
      notes,
    });
  }
  reval();
}

export async function deleteStream(id: string) {
  const { user, supabase } = await requireUser();
  await supabase
    .from("income_streams")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  reval();
}

// ────────────────────────── Income History ──────────────────────────

export async function setMonthlyAmount(
  streamId: string,
  month: string,
  amount: number
) {
  const { user, supabase } = await requireUser();
  if (amount === 0 || Number.isNaN(amount)) {
    await supabase
      .from("income_history")
      .delete()
      .eq("user_id", user.id)
      .eq("stream_id", streamId)
      .eq("month", month);
  } else {
    await supabase.from("income_history").upsert(
      {
        user_id: user.id,
        stream_id: streamId,
        month,
        amount,
      },
      { onConflict: "stream_id,month" }
    );
  }

  const { data: hist } = await supabase
    .from("income_history")
    .select("amount")
    .eq("user_id", user.id)
    .eq("stream_id", streamId)
    .order("month", { ascending: false })
    .limit(6);

  if (hist && hist.length > 0) {
    const avg =
      hist.reduce((a, h) => a + Number(h.amount), 0) / hist.length;
    await supabase
      .from("income_streams")
      .update({ avg_monthly: avg })
      .eq("id", streamId)
      .eq("user_id", user.id);
  }
  reval();
}
