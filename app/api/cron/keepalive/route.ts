import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force this route to be dynamic — we don't want any caching of cron pings.
export const dynamic = "force-dynamic";

const TABLES = [
  "financial_settings",
  "debts",
  "expenses",
  "income_streams",
];

/**
 * Daily keepalive ping. Vercel Cron hits this once a day (see vercel.json)
 * and we make a cheap query against each main Supabase table so the project
 * keeps recording activity and doesn't auto-pause on the free tier.
 *
 * Auth: Vercel automatically attaches `Authorization: Bearer ${CRON_SECRET}`
 * to scheduled cron requests when CRON_SECRET is set as an env var on the
 * project. If the env var isn't set, the route accepts unauthenticated
 * requests too — handy for local testing.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = request.headers.get("authorization") ?? "";
    if (got !== `Bearer ${expected}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500 }
    );
  }

  // Use the service role so the ping doesn't depend on RLS or a session.
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: Record<string, { count?: number; error?: string }> = {};
  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) {
      results[table] = { error: error.message };
    } else {
      results[table] = { count: count ?? 0 };
    }
  }

  const anyError = Object.values(results).some((r) => r.error);
  return NextResponse.json(
    {
      ok: !anyError,
      timestamp: new Date().toISOString(),
      results,
    },
    { status: anyError ? 207 : 200 }
  );
}
