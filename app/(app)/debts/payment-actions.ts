"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS = ["/", "/debts", "/strategy", "/house-goal", "/income"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

function num(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function dateOrToday(v: FormDataEntryValue | null): string {
  const s = String(v ?? "").trim();
  if (!s) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return new Date().toISOString().slice(0, 10);
}

export async function logDebtPayment(formData: FormData) {
  const { user, supabase } = await requireUser();
  const debt_id = String(formData.get("debt_id") ?? "").trim();
  const amount = num(formData.get("amount"));
  const payment_date = dateOrToday(formData.get("payment_date"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!debt_id) throw new Error("Missing debt id");
  if (amount <= 0) throw new Error("Payment amount must be greater than 0");

  // Pull the current debt to compute new balance
  const { data: debt, error: fetchErr } = await supabase
    .from("debts")
    .select("balance")
    .eq("id", debt_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!debt) throw new Error("Debt not found");

  const newBalance = Math.max(0, Number(debt.balance) - amount);

  // Log the payment with a balance_after snapshot
  const { error: insertErr } = await supabase.from("debt_payments").insert({
    user_id: user.id,
    debt_id,
    amount,
    payment_date,
    balance_after: newBalance,
    notes,
  });
  if (insertErr) {
    console.error("[debt_payments] insert failed:", insertErr.message);
    throw new Error(insertErr.message);
  }

  // Update debt balance + auto-mark paid_off if it hits zero
  const { error: updateErr } = await supabase
    .from("debts")
    .update({
      balance: newBalance,
      is_paid_off: newBalance <= 0.01,
      paid_off_at: newBalance <= 0.01 ? new Date().toISOString() : null,
    })
    .eq("id", debt_id)
    .eq("user_id", user.id);
  if (updateErr) {
    console.error("[debts] balance update failed:", updateErr.message);
    throw new Error(updateErr.message);
  }

  reval();
}

export async function deleteDebtPayment(paymentId: string) {
  const { user, supabase } = await requireUser();

  // Fetch the payment so we can restore the balance
  const { data: payment, error: fetchErr } = await supabase
    .from("debt_payments")
    .select("debt_id, amount")
    .eq("id", paymentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!payment) throw new Error("Payment not found");

  // Get current debt to add the amount back
  const { data: debt } = await supabase
    .from("debts")
    .select("balance")
    .eq("id", payment.debt_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: deleteErr } = await supabase
    .from("debt_payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", user.id);
  if (deleteErr) throw new Error(deleteErr.message);

  if (debt) {
    const restored = Number(debt.balance) + Number(payment.amount);
    await supabase
      .from("debts")
      .update({
        balance: restored,
        is_paid_off: restored <= 0.01,
        paid_off_at: restored <= 0.01 ? new Date().toISOString() : null,
      })
      .eq("id", payment.debt_id)
      .eq("user_id", user.id);
  }

  reval();
}
