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
  const { data } = await supabase
    .from("financial_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) return data as FinancialSettings;

  const { data: created } = await supabase
    .from("financial_settings")
    .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
    .select()
    .single();

  return created as FinancialSettings;
}
