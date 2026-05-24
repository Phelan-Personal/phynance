import Link from "next/link";
import { headers } from "next/headers";
import { signUp } from "./actions";

type SearchParams = Promise<{ error?: string; confirm?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, confirm } = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <h2 className="text-lg font-medium">Create account</h2>

      {error && (
        <div className="mt-4 rounded-md border border-[color:var(--coral)]/30 bg-[var(--coral-bg)] px-3 py-2 text-xs text-[var(--coral)]">
          {error}
        </div>
      )}
      {confirm && (
        <div className="mt-4 rounded-md border border-[color:var(--teal)]/30 bg-[var(--teal-bg)] px-3 py-2 text-xs text-[var(--teal-dark)]">
          Check your email to confirm your account.
        </div>
      )}

      <form action={signUp} className="mt-5 space-y-3">
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
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">Password</label>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1"
          />
          <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
            At least 6 characters.
          </p>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-[var(--teal)] py-2 text-sm font-medium text-white hover:bg-[var(--teal-dark)] transition-colors"
        >
          Create account
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--teal)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
