import type { FinancialSettings } from "@/types";
import { requireUser } from "@/lib/auth";

export const DEFAULT_SETTINGS = {
  personal_draw: 0,
  se_tax_rate: 15.3,
  income_tax_rate: 22,
  payoff_strategy: "avalanche" as const,
  extra_payment_override: null,
  house_target_price: null,
  house_down_payment_pct: 20,
  house_current_savings: 0,
  house_monthly_save: 0,
  house_mortgage_rate: 7.0,
  house_target_date: null,
};

export async function getOrCreateSettings(): Promise<FinancialSettings> {
  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("financial_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[settings] select failed:", error.message);
  }
  if (data) return data as FinancialSettings;

  const { data: created, error: insertError } = await supabase
    .from("financial_settings")
    .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
    .select()
    .single();

  if (insertError) {
    console.error("[settings] insert failed:", insertError.message);
  }
  if (created) return created as FinancialSettings;

  // Fallback so the UI never crashes if Supabase is unreachable
  // or the schema hasn't been applied yet. Settings just won't persist
  // until the underlying issue is fixed.
  return {
    id: "",
    user_id: user.id,
    ...DEFAULT_SETTINGS,
    updated_at: new Date().toISOString(),
  } as FinancialSettings;
}
