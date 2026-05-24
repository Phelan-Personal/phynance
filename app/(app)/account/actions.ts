"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export async function updatePassword(formData: FormData) {
  const { supabase } = await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  if (password !== confirm) {
    throw new Error("Passwords don't match");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[account] updatePassword failed:", error.message);
    throw new Error(error.message);
  }
  revalidatePath("/account");
}
