import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { csvFilename, toCsv } from "@/lib/csv";

const ALLOWED = new Set([
  "debts",
  "expenses",
  "expense_history",
  "expense_transactions",
  "income_streams",
  "income_history",
  "assets",
  "projects",
  "bank_scans",
  "financial_settings",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!ALLOWED.has(table)) {
    return new NextResponse("Unknown table", { status: 404 });
  }
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", user.id);
  if (error) {
    return new NextResponse(`Export failed: ${error.message}`, {
      status: 500,
    });
  }
  const csv = toCsv((data ?? []) as Array<Record<string, unknown>>);
  // UTF-8 BOM so Excel opens it cleanly
  const body = "﻿" + csv;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(table)}"`,
      "Cache-Control": "no-store",
    },
  });
}
