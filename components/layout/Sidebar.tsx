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
  { href: "/assets", label: "Assets", icon: PiggyBank },
  { href: "/strategy", label: "Strategy", icon: Target },
  { href: "/bank-scan", label: "Bank Scan", icon: FileSpreadsheet },
  { href: "/house-goal", label: "House Goal", icon: Home },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
      <button
        onClick={handleSignOut}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] py-1.5 text-xs hover:bg-[var(--muted)] transition-colors"
      >
        <LogOut size={12} aria-hidden /> Sign out
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
        <span className="font-semibold">Phynance</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 hover:bg-[var(--muted)]"
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
