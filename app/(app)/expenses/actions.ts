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
  const isRecurringRaw = String(formData.get("is_recurring") ?? "true");
  const is_recurring = isRecurringRaw !== "false";

  if (!name) throw new Error("Name is required");
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    name,
    type,
    amount,
    category,
    is_recurring,
  });
  if (error) {
    console.error("[expenses] insert failed:", error.message);
    throw new Error(error.message);
  }
  reval();
}

export async function addExpensesBulk(
  items: Array<{
    name: string;
    type: "personal" | "business";
    amount: number;
    category: string | null;
    is_recurring?: boolean;
  }>
) {
  const { user, supabase } = await requireUser();
  if (!items.length) return { inserted: 0 };

  const rows = items
    .filter((i) => i.name && i.amount > 0)
    .map((i) => ({
      user_id: user.id,
      name: i.name,
      type: i.type,
      amount: i.amount,
      category: i.category,
      is_recurring: i.is_recurring ?? true,
    }));

  if (!rows.length) return { inserted: 0 };

  const { error, data } = await supabase
    .from("expenses")
    .insert(rows)
    .select("id");
  if (error) {
    console.error("[expenses] bulk insert failed:", error.message);
    throw new Error(error.message);
  }
  reval();
  return { inserted: data?.length ?? rows.length };
}

export async function deleteExpense(id: string) {
  const { user, supabase } = await requireUser();
  await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  reval();
}
