"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS = ["/", "/expenses", "/income", "/strategy", "/house-goal"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

export async function addExpense(formData: FormData) {
  const { user, supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "business") as
    | "business"
    | "personal";
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
  const category = String(formData.get("category") ?? "").trim() || null;
  if (!name || !amount) return;

  await supabase.from("expenses").insert({
    user_id: user.id,
    name,
    type,
    amount,
    category,
    is_recurring: true,
  });
  reval();
}

export async function deleteExpense(id: string) {
  const { user, supabase } = await requireUser();
  await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  reval();
}
