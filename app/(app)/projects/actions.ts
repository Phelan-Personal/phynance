"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS = ["/", "/projects", "/expenses", "/bank-scan"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

export async function upsertProject(formData: FormData) {
  const { user, supabase } = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const is_archived = String(formData.get("is_archived") ?? "") === "on";

  if (!name) throw new Error("Name is required");

  if (id) {
    const { error } = await supabase
      .from("projects")
      .update({ name, notes, is_archived })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[projects] update failed:", error.message);
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name, notes, is_archived });
    if (error) {
      console.error("[projects] insert failed:", error.message);
      throw new Error(error.message);
    }
  }
  reval();
}

export async function deleteProject(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[projects] delete failed:", error.message);
    throw new Error(error.message);
  }
  reval();
}
