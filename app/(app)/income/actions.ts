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

function check<E extends { message: string } | null | undefined>(
  label: string,
  error: E
) {
  if (error) {
    console.error(`[${label}]`, error.message);
    throw new Error(error.message);
  }
}

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
    const { error } = await supabase
      .from("financial_settings")
      .update(update)
      .eq("user_id", user.id);
    check("saveSettings.update", error);
  } else {
    const { error } = await supabase
      .from("financial_settings")
      .insert({ user_id: user.id, ...DEFAULT_SETTINGS, ...update });
    check("saveSettings.insert", error);
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
    const { error } = await supabase
      .from("financial_settings")
      .update(update)
      .eq("user_id", user.id);
    check("saveHouseGoal.update", error);
  } else {
    const { error } = await supabase
      .from("financial_settings")
      .insert({ user_id: user.id, ...DEFAULT_SETTINGS, ...update });
    check("saveHouseGoal.insert", error);
  }
  reval();
}

// ────────────────────────── Income Streams ──────────────────────────

// Convert YYYY-MM (month input) to YYYY-MM-01 (date column)
function toFirstOfMonth(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7) + "-01";
  return null;
}

export async function upsertStream(formData: FormData) {
  const { user, supabase } = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "business");
  const avg_monthly = numOr0(formData.get("avg_monthly"));
  const is_primary = String(formData.get("is_primary") ?? "") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const start_month = toFirstOfMonth(formData.get("start_month"));
  const end_month = toFirstOfMonth(formData.get("end_month"));
  if (!name) throw new Error("Name is required");

  if (is_primary) {
    const { error } = await supabase
      .from("income_streams")
      .update({ is_primary: false })
      .eq("user_id", user.id);
    check("upsertStream.unsetPrimary", error);
  }

  if (id) {
    const { error } = await supabase
      .from("income_streams")
      .update({
        name,
        type,
        avg_monthly,
        is_primary,
        notes,
        start_month,
        end_month,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    check("upsertStream.update", error);
  } else {
    const { error } = await supabase.from("income_streams").insert({
      user_id: user.id,
      name,
      type,
      avg_monthly,
      is_primary,
      notes,
      start_month,
      end_month,
    });
    check("upsertStream.insert", error);
  }
  reval();
}

export async function deleteStream(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("income_streams")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  check("deleteStream", error);
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
    const { error } = await supabase
      .from("income_history")
      .delete()
      .eq("user_id", user.id)
      .eq("stream_id", streamId)
      .eq("month", month);
    check("setMonthlyAmount.delete", error);
  } else {
    const { error } = await supabase.from("income_history").upsert(
      {
        user_id: user.id,
        stream_id: streamId,
        month,
        amount,
      },
      { onConflict: "stream_id,month" }
    );
    check("setMonthlyAmount.upsert", error);
  }

  // Recompute avg over the months the stream was actually active (or last 6 if no range set)
  const { data: stream } = await supabase
    .from("income_streams")
    .select("start_month,end_month")
    .eq("id", streamId)
    .eq("user_id", user.id)
    .maybeSingle();

  let query = supabase
    .from("income_history")
    .select("amount,month")
    .eq("user_id", user.id)
    .eq("stream_id", streamId)
    .order("month", { ascending: false });

  if (stream?.start_month) {
    query = query.gte("month", stream.start_month);
  }
  if (stream?.end_month) {
    query = query.lte("month", stream.end_month);
  }

  const { data: hist } = await query.limit(12);
  const inRange = hist ?? [];

  if (inRange.length > 0) {
    const avg = inRange.reduce((a, h) => a + Number(h.amount), 0) / inRange.length;
    const { error } = await supabase
      .from("income_streams")
      .update({ avg_monthly: avg })
      .eq("id", streamId)
      .eq("user_id", user.id);
    check("setMonthlyAmount.updateAvg", error);
  }
  reval();
}
