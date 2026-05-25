"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const reval = () => revalidatePath("/");

export async function addNextStep(formData: FormData) {
  const { user, supabase } = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category =
    String(formData.get("category") ?? "other") as
      | "debt"
      | "cashflow"
      | "income"
      | "savings"
      | "tax"
      | "house"
      | "rewards"
      | "other";
  const priorityRaw = String(formData.get("priority") ?? "5");
  const priority = parseInt(priorityRaw, 10) || 5;
  const due_date = String(formData.get("due_date") ?? "").trim() || null;
  const source_key = String(formData.get("source_key") ?? "").trim() || null;

  if (!title) throw new Error("Title is required");

  const { error } = await supabase.from("next_steps").insert({
    user_id: user.id,
    title,
    description,
    category,
    priority,
    due_date,
    source_key,
  });
  if (error) {
    console.error("[next_steps] insert failed:", error.message);
    throw new Error(error.message);
  }
  reval();
}

export async function toggleNextStep(id: string, completed: boolean) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("next_steps")
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  reval();
}

export async function deleteNextStep(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("next_steps")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  reval();
}
