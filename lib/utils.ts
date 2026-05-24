import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export const fmtCurrencyExact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const fmtPct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

export const fmtMonthYear = (monthsFromNow: number): string => {
  if (!Number.isFinite(monthsFromNow)) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

export const fmtShortMonthYear = (monthsFromNow: number): string => {
  if (!Number.isFinite(monthsFromNow)) return "";
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

export const aprColor = (rate: number): string => {
  if (rate < 10) return "text-[var(--teal)]";
  if (rate <= 18) return "text-[var(--amber)]";
  return "text-[var(--coral)]";
};

export const dtiColor = (dti: number): string => {
  if (dti < 36) return "text-[var(--teal)]";
  if (dti <= 43) return "text-[var(--amber)]";
  return "text-[var(--coral)]";
};

export const monthDateString = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};
