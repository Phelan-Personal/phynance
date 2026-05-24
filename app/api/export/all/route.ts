import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonFilename } from "@/lib/csv";

const TABLES = [
  "financial_settings",
  "debts",
  "expenses",
  "expense_history",
  "expense_transactions",
  "income_streams",
  "income_history",
  "assets",
  "projects",
  "bank_scans",
] as const;

export async function GET() {
  const { user, supabase } = await requireUser();

  const data: Record<string, unknown> = {};
  for (const t of TABLES) {
    const { data: rows, error } = await supabase
      .from(t)
      .select("*")
      .eq("user_id", user.id);
    if (error) {
      data[t] = { error: error.message };
    } else {
      data[t] = rows ?? [];
    }
  }

  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      data,
    },
    null,
    2
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${jsonFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
