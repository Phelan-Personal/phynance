"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

const PATHS = ["/", "/bank-scan", "/expenses", "/income"];
const reval = () => PATHS.forEach((p) => revalidatePath(p));

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

export type TxnImportItem = {
  name: string;
  type: "personal" | "business";
  amount: number;
  category: string | null;
  occurred_on: string; // YYYY-MM-DD
};

export async function addTransactionsFromScan(items: TxnImportItem[]) {
  const { user, supabase } = await requireUser();
  const rows = items
    .filter((i) => i.name && i.amount > 0 && i.occurred_on)
    .map((i) => ({
      user_id: user.id,
      name: i.name,
      type: i.type,
      amount: i.amount,
      category: i.category,
      occurred_on: i.occurred_on,
      source: "bank_scan",
    }));
  if (!rows.length) return { inserted: 0 };

  const { error, data } = await supabase
    .from("expense_transactions")
    .insert(rows)
    .select("id");
  if (error) {
    console.error("[expense_transactions] insert failed:", error.message);
    throw new Error(error.message);
  }
  reval();
  return { inserted: data?.length ?? rows.length };
}

export async function listRecentTransactions(limit = 50) {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("expense_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[expense_transactions] list failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function deleteTransaction(id: string) {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("expense_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  reval();
}
