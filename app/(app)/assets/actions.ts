"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS = ["/", "/assets", "/house-goal"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

function num(v: FormDataEntryValue | null, fallback = 0): number {
  if (v === null) return fallback;
  const s = String(v).trim();
  if (!s) return fallback;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

export async function upsertAsset(formData: FormData) {
  const { user, supabase } = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "savings") as
    | "savings"
    | "bank_account"
    | "crypto"
    | "stock"
    | "other";
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const trackUnits = String(formData.get("track_units") ?? "") === "on";

  if (!name) throw new Error("Name is required");

  let units: number;
  let price_per_unit: number;

  if (trackUnits) {
    units = num(formData.get("units"));
    price_per_unit = num(formData.get("price_per_unit"));
  } else {
    // Plain "total value" mode — store as 1 unit × total for consistency.
    units = 1;
    price_per_unit = num(formData.get("balance"));
  }

  const payload = {
    name,
    type,
    symbol,
    units,
    price_per_unit,
    notes,
  };

  if (id) {
    const { error } = await supabase
      .from("assets")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[assets] update failed:", error.message);
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("assets")
      .insert({ user_id: user.id, ...payload });
    if (error) {
      console.error("[assets] insert failed:", error.message);
      throw new Error(error.message);
    }
  }
  reval();
}

export async function deleteAsset(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[assets] delete failed:", error.message);
    throw new Error(error.message);
  }
  reval();
}

export async function updateAssetPrice(id: string, price_per_unit: number) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("assets")
    .update({ price_per_unit })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  reval();
}
