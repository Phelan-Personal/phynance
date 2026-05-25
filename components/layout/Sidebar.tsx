"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  Receipt,
  Target,
  FileSpreadsheet,
  Home,
  CalendarDays,
  PiggyBank,
  FolderKanban,
  KeyRound,
  Flag,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cashflow", label: "Cashflow", icon: CalendarDays },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/debts", label: "Debts", icon: CreditCard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/assets", label: "Assets", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Flag },
  { href: "/strategy", label: "Strategy", icon: Target },
  { href: "/bank-scan", label: "Bank Scan", icon: FileSpreadsheet },
  { href: "/house-goal", label: "House Goal", icon: Home },
];

// Pages not in the main nav (e.g. account) still need a title for the mobile bar
const EXTRA_TITLES: Record<string, string> = {
  "/account": "Account",
};

function currentPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const nav = NAV.find(
    (n) => n.href !== "/" && pathname.startsWith(n.href)
  );
  if (nav) return nav.label;
  const extra = Object.entries(EXTRA_TITLES).find(([href]) =>
    pathname.startsWith(href)
  );
  if (extra) return extra[1];
  return "Phynance";
}

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageTitle = currentPageTitle(pathname);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const nav = (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[var(--teal-bg)] text-[var(--teal-dark)] font-medium"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon size={16} aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-[var(--border)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        Signed in as
      </div>
      <div className="mt-0.5 truncate text-xs">{email}</div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1 rounded-md border border-[var(--border)] py-1.5 text-[11px] hover:bg-[var(--background)] transition-colors"
        >
          <KeyRound size={11} aria-hidden /> Account
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-1 rounded-md border border-[var(--border)] py-1.5 text-[11px] hover:bg-[var(--background)] transition-colors"
        >
          <LogOut size={11} aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            Phynance
          </span>
          <span className="text-[var(--muted-foreground)]">/</span>
          <span className="font-semibold truncate">{pageTitle}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 hover:bg-[var(--muted)] shrink-0"
        >
          <Menu size={18} />
        </button>
      </div>
      <div className="md:hidden h-12" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--muted)]">
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <div className="text-lg font-semibold tracking-tight">Phynance</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            Cashflow & debt planning
          </div>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative ml-auto flex h-full w-[260px] flex-col bg-[var(--background)] border-l border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="font-semibold">Phynance</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 hover:bg-[var(--muted)]"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
