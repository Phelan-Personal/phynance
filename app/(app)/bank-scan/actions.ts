"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export type BankScanSummaryRow = {
  category: string;
  total: number;
  count: number;
};

export async function saveBankScan(input: {
  filename: string | null;
  totalTransactions: number;
  totalOutflow: number;
  summary: BankScanSummaryRow[];
}) {
  const { user, supabase } = await requireUser();
  const summaryObj: Record<string, { total: number; count: number }> = {};
  for (const row of input.summary) {
    summaryObj[row.category] = { total: row.total, count: row.count };
  }
  const { data, error } = await supabase
    .from("bank_scans")
    .insert({
      user_id: user.id,
      filename: input.filename,
      total_transactions: input.totalTransactions,
      total_outflow: input.totalOutflow,
      summary: summaryObj,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[bank_scans] insert failed:", error.message);
    throw new Error(error.message);
  }
  revalidatePath("/bank-scan");
  return { id: data.id };
}

export async function listBankScans() {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("bank_scans")
    .select("*")
    .eq("user_id", user.id)
    .order("scanned_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[bank_scans] list failed:", error.message);
    return [];
  }
  return data ?? [];
}
