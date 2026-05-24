"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  KeyRound,
  Mail,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { updatePassword } from "@/app/(app)/account/actions";

const EXPORT_TABLES: { table: string; label: string; hint: string }[] = [
  { table: "debts", label: "Debts", hint: "balances, APR, min, due day, credit limit" },
  { table: "expenses", label: "Expenses", hint: "monthly/annual/quarterly/variable, due days, projects" },
  { table: "expense_history", label: "Expense history", hint: "monthly actuals for variable expenses (payroll, etc.)" },
  { table: "expense_transactions", label: "Transactions", hint: "dated single-charge events; bank-scan imports" },
  { table: "income_streams", label: "Income streams", hint: "name, type, avg, pay days, active range" },
  { table: "income_history", label: "Income history", hint: "monthly actuals per stream" },
  { table: "assets", label: "Assets", hint: "savings, crypto, stock holdings" },
  { table: "projects", label: "Projects", hint: "cost centers" },
  { table: "bank_scans", label: "Bank scan summaries", hint: "stored category summaries per CSV import" },
  { table: "financial_settings", label: "Financial settings", hint: "tax rates, draw, strategy, house goal, cash on hand" },
];

export function AccountClient({ email }: { email: string }) {
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs flex items-start gap-2",
            banner.kind === "ok"
              ? "bg-[var(--teal-bg)] border-[color:var(--teal)]/30 text-[var(--teal-dark)]"
              : "bg-[var(--coral-bg)] border-[color:var(--coral)]/30 text-[var(--coral)]"
          )}
        >
          {banner.kind === "ok" ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <Card>
        <CardTitle>Sign-in</CardTitle>
        <div className="flex items-center gap-2 text-sm">
          <Mail size={14} className="text-[var(--muted-foreground)]" />
          <span className="text-[var(--muted-foreground)]">Email:</span>
          <span className="font-medium">{email}</span>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
          You can sign in with a magic link or with email + password.
        </p>
      </Card>

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <KeyRound size={14} />
            Set a new password
          </span>
        </CardTitle>
        <form
          action={(fd) =>
            startTransition(async () => {
              try {
                await updatePassword(fd);
                setBanner({ kind: "ok", text: "Password updated." });
                (document.getElementById("acct-pw") as HTMLFormElement)?.reset();
              } catch (e) {
                setBanner({
                  kind: "err",
                  text: `Couldn't update password: ${(e as Error).message}`,
                });
              }
            })
          }
          id="acct-pw"
          className="space-y-3 max-w-sm"
        >
          <label className="block">
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              New password
            </div>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              Confirm new password
            </div>
            <input
              type="password"
              name="confirm"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            At least 6 characters. After saving you can sign in with either
            magic link or this password.
          </p>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Update password"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle
          right={
            <a
              href="/api/export/all"
              download
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--teal)] text-white px-3 py-1.5 text-xs font-medium hover:bg-[var(--teal-dark)] transition-colors"
            >
              <Download size={12} /> Download everything (JSON)
            </a>
          }
        >
          <span className="inline-flex items-center gap-2">
            <Download size={14} />
            Export your data
          </span>
        </CardTitle>
        <p className="-mt-2 mb-3 text-[11px] text-[var(--muted-foreground)]">
          CSV per table, or one JSON with everything for backup. Opens with
          Excel, Google Sheets, or any text editor.
        </p>
        <ul className="divide-y divide-[var(--border)]">
          {EXPORT_TABLES.map((t) => (
            <li
              key={t.table}
              className="py-2 flex items-center gap-3 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium">{t.label}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                  {t.hint} ·{" "}
                  <span className="font-mono">{t.table}</span>
                </div>
              </div>
              <a
                href={`/api/export/${t.table}`}
                download
                className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] hover:bg-[var(--muted)] transition-colors"
              >
                <Download size={10} /> CSV
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
