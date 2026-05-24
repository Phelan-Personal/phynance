import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ClientHashHandler } from "./ClientHashHandler";

type SearchParams = Promise<{
  code?: string;
  token_hash?: string;
  type?: string;
  next?: string;
  error?: string;
  error_description?: string;
}>;

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";

  if (sp.error) {
    redirect(
      `/login?error=${encodeURIComponent(sp.error_description ?? sp.error)}`
    );
  }

  if (sp.code || sp.token_hash) {
    const supabase = await createClient();

    if (sp.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(sp.code);
      if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`);
      }
      redirect(next);
    }

    if (sp.token_hash && sp.type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: sp.token_hash,
        type: sp.type as EmailOtpType,
      });
      if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`);
      }
      redirect(next);
    }
  }

  // No code/token_hash in the URL — Supabase's default magic-link template
  // redirects through their verify endpoint which lands here with a URL
  // hash fragment (#access_token=…). Hash fragments don't reach the
  // server, so we hand off to the client.
  return <ClientHashHandler next={next} />;
}
