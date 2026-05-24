import Link from "next/link";
import { headers } from "next/headers";
import { sendResetEmail } from "./actions";

type SearchParams = Promise<{ error?: string; sent?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, sent } = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <h2 className="text-lg font-medium">Reset your password</h2>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
        Enter the email on your account and we'll send a link to set a new
        password. The link signs you in so you can pick a new one in /account.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-[color:var(--coral)]/30 bg-[var(--coral-bg)] px-3 py-2 text-xs text-[var(--coral)]">
          {error}
        </div>
      )}
      {sent && (
        <div className="mt-4 rounded-md border border-[color:var(--teal)]/30 bg-[var(--teal-bg)] px-3 py-2 text-xs text-[var(--teal-dark)]">
          Reset link sent. Check your inbox.
        </div>
      )}

      <form action={sendResetEmail} className="mt-5 space-y-3">
        <input type="hidden" name="origin" value={origin} />
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Email</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-[var(--teal)] py-2 text-sm font-medium text-white hover:bg-[var(--teal-dark)] transition-colors"
        >
          Send reset link
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-[var(--muted-foreground)]">
        <Link href="/login" className="text-[var(--teal)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
