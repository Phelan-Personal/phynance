"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/data";

const PATHS = ["/", "/strategy", "/income", "/house-goal"];

export async function setStrategy(strategy: "avalanche" | "snowball") {
  const { user, supabase } = await requireUser();
  const { data: existing } = await supabase
    .from("financial_settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("financial_settings")
      .update({ payoff_strategy: strategy })
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("financial_settings")
      .insert({
        user_id: user.id,
        ...DEFAULT_SETTINGS,
        payoff_strategy: strategy,
      });
  }
  PATHS.forEach((p) => revalidatePath(p));
}
