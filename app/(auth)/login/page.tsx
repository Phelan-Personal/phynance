import Link from "next/link";
import { headers } from "next/headers";
import { signIn, signInMagicLink } from "./actions";

type SearchParams = Promise<{ error?: string; sent?: string }>;

export default async function LoginPage({
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
      <h2 className="text-lg font-medium">Sign in</h2>

      {error && (
        <div className="mt-4 rounded-md border border-[color:var(--coral)]/30 bg-[var(--coral-bg)] px-3 py-2 text-xs text-[var(--coral)]">
          {error}
        </div>
      )}
      {sent && (
        <div className="mt-4 rounded-md border border-[color:var(--teal)]/30 bg-[var(--teal-bg)] px-3 py-2 text-xs text-[var(--teal-dark)]">
          Magic link sent. Check your email.
        </div>
      )}

      <form action={signIn} className="mt-5 space-y-3">
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
            autoComplete="current-password"
            className="mt-1"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-[var(--teal)] py-2 text-sm font-medium text-white hover:bg-[var(--teal-dark)] transition-colors"
        >
          Sign in
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
          or
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form action={signInMagicLink} className="space-y-3">
        <input type="hidden" name="origin" value={origin} />
        <div>
          <label className="text-xs text-[var(--muted-foreground)]">
            Email me a magic link
          </label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1"
            placeholder="you@example.com"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md border border-[var(--border)] py-2 text-sm font-medium hover:bg-[var(--muted)] transition-colors"
        >
          Send magic link
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-[var(--muted-foreground)]">
        No account?{" "}
        <Link href="/signup" className="text-[var(--teal)] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
