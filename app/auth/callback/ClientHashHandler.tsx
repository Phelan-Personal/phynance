"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ClientHashHandler({ next }: { next: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const supabase = createClient();
    const hash =
      typeof window !== "undefined" ? window.location.hash : "";

    // Parse the hash fragment ourselves so we can call setSession with
    // the right tokens. detectSessionInUrl in @supabase/ssr only runs once
    // and can race with a programmatic redirect.
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const hashError =
      params.get("error_description") ?? params.get("error") ?? null;

    if (hashError) {
      setStatus("error");
      setErrorMsg(hashError);
      router.replace(
        `/login?error=${encodeURIComponent(hashError)}`
      );
      return;
    }

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            setStatus("error");
            setErrorMsg(error.message);
            router.replace(
              `/login?error=${encodeURIComponent(error.message)}`
            );
            return;
          }
          // Clear hash so back button doesn't replay
          if (typeof window !== "undefined") {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search
            );
          }
          router.replace(next);
          router.refresh();
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          setStatus("error");
          setErrorMsg(msg);
          router.replace(`/login?error=${encodeURIComponent(msg)}`);
        });
      return;
    }

    // No hash either — give up
    const msg = "Auth callback was missing both ?code= and a hash fragment.";
    setStatus("error");
    setErrorMsg(msg);
    router.replace(`/login?error=${encodeURIComponent(msg)}`);
  }, [next, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--muted)] p-6">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 text-center w-full max-w-sm">
        {status === "working" ? (
          <>
            <div className="text-sm font-medium">Signing you in…</div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              Verifying your magic link.
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium text-[var(--coral)]">
              Couldn't complete sign-in
            </div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              {errorMsg}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
