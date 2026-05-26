"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS = ["/", "/income", "/cashflow"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

function num(v: FormDataEntryValue | null, fallback = 0): number {
  if (v === null) return fallback;
  const s = String(v).trim();
  if (!s) return fallback;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

function parseDay(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > 31) return null;
  return n;
}

function dateOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function upsertRecurring(formData: FormData) {
  const { user, supabase } = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const client_name =
    String(formData.get("client_name") ?? "").trim() || null;
  const amount = num(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim() || null;
  const due_day = parseDay(formData.get("due_day"));
  const start_month = dateOrNull(formData.get("start_month"));
  const end_month = dateOrNull(formData.get("end_month"));
  const streamRaw = String(formData.get("stream_id") ?? "").trim();
  const stream_id = streamRaw && streamRaw !== "none" ? streamRaw : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const is_archived =
    String(formData.get("is_archived") ?? "") === "on";

  if (!name) throw new Error("Name is required");
  if (amount <= 0) throw new Error("Amount must be greater than 0");

  const payload = {
    name,
    client_name,
    amount,
    category,
    due_day,
    start_month,
    end_month,
    stream_id,
    notes,
    is_archived,
  };

  if (id) {
    const { error } = await supabase
      .from("recurring_revenue")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[recurring_revenue] update failed:", error.message);
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("recurring_revenue")
      .insert({ user_id: user.id, ...payload });
    if (error) {
      console.error("[recurring_revenue] insert failed:", error.message);
      throw new Error(error.message);
    }
  }
  reval();
}

export async function deleteRecurring(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("recurring_revenue")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  reval();
}

export type ImportRecurringItem = {
  name: string;
  client_name?: string;
  amount: number;
  category?: string;
  due_day?: number;
  notes?: string;
};

export async function importRecurringBulk(items: ImportRecurringItem[]) {
  const { user, supabase } = await requireUser();
  const rows = items
    .filter((i) => i.name && i.amount > 0)
    .map((i) => ({
      user_id: user.id,
      name: i.name.trim(),
      client_name: i.client_name?.trim() || null,
      amount: Number(i.amount),
      category: i.category?.trim() || null,
      due_day:
        i.due_day && i.due_day >= 1 && i.due_day <= 31 ? i.due_day : null,
      notes: i.notes?.trim() || null,
    }));
  if (!rows.length) return { inserted: 0 };

  const { error, data } = await supabase
    .from("recurring_revenue")
    .insert(rows)
    .select("id");
  if (error) {
    console.error("[recurring_revenue] bulk insert failed:", error.message);
    throw new Error(error.message);
  }
  reval();
  return { inserted: data?.length ?? rows.length };
}
