"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS = ["/", "/income", "/cashflow"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

const numOrNull = (v: FormDataEntryValue | null): number | null => {
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const dateOrNull = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s || null;
};

export async function upsertPendingPayment(formData: FormData) {
  const { user, supabase } = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const client_name = String(formData.get("client_name") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;
  const amount = numOrNull(formData.get("amount"));
  const issued_on = dateOrNull(formData.get("issued_on"));
  const expected_on = dateOrNull(formData.get("expected_on"));
  const streamRaw = String(formData.get("stream_id") ?? "").trim();
  const stream_id = streamRaw && streamRaw !== "none" ? streamRaw : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!client_name) throw new Error("Client name is required");
  if (amount === null || amount <= 0)
    throw new Error("Amount must be greater than 0");

  const payload = {
    client_name,
    description,
    amount,
    issued_on,
    expected_on,
    stream_id,
    notes,
  };

  if (id) {
    const { error } = await supabase
      .from("pending_payments")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[pending_payments] update failed:", error.message);
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("pending_payments")
      .insert({ user_id: user.id, ...payload });
    if (error) {
      console.error("[pending_payments] insert failed:", error.message);
      throw new Error(error.message);
    }
  }
  reval();
}

export async function markPaymentReceived(id: string, dateIso?: string) {
  const { user, supabase } = await requireUser();
  const received_on =
    dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)
      ? dateIso
      : new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("pending_payments")
    .update({ received_on })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[pending_payments] mark received failed:", error.message);
    throw new Error(error.message);
  }
  reval();
}

export async function markPaymentUnreceived(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("pending_payments")
    .update({ received_on: null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  reval();
}

export async function deletePendingPayment(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("pending_payments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[pending_payments] delete failed:", error.message);
    throw new Error(error.message);
  }
  reval();
}
