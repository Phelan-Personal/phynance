"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendResetEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const origin = String(formData.get("origin") ?? "");
  if (!email) redirect(`/forgot-password?error=${encodeURIComponent("Email is required")}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/account`,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/forgot-password?sent=1");
}
