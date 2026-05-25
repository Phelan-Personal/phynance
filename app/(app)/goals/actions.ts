"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS = ["/", "/goals"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

const numOrNull = (v: FormDataEntryValue | null): number | null => {
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const numOr0 = (v: FormDataEntryValue | null) => numOrNull(v) ?? 0;

export async function upsertGoal(formData: FormData) {
  const { user, supabase } = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "custom") as
    | "emergency_fund"
    | "retirement"
    | "savings"
    | "investment"
    | "debt_payoff"
    | "custom";
  const target_amount = numOr0(formData.get("target_amount"));
  const current_amount = numOr0(formData.get("current_amount"));
  const target_date =
    String(formData.get("target_date") ?? "").trim() || null;
  const linkedRaw = String(formData.get("linked_asset_id") ?? "").trim();
  const linked_asset_id =
    linkedRaw && linkedRaw !== "none" ? linkedRaw : null;
  const monthly_contribution_override = numOrNull(
    formData.get("monthly_contribution_override")
  );
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const is_archived = String(formData.get("is_archived") ?? "") === "on";

  if (!name) throw new Error("Name is required");
  if (target_amount <= 0)
    throw new Error("Target amount must be greater than 0");

  const payload = {
    name,
    kind,
    target_amount,
    current_amount,
    linked_asset_id,
    target_date,
    monthly_contribution_override,
    notes,
    is_archived,
  };

  if (id) {
    const { error } = await supabase
      .from("goals")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[goals] update failed:", error.message);
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("goals")
      .insert({ user_id: user.id, ...payload });
    if (error) {
      console.error("[goals] insert failed:", error.message);
      throw new Error(error.message);
    }
  }
  reval();
}

export async function deleteGoal(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[goals] delete failed:", error.message);
    throw new Error(error.message);
  }
  reval();
}
