import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <Sidebar email={user.email ?? ""} />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-[1100px] px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
