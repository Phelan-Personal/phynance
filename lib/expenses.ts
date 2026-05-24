import type { Expense } from "@/types";

/**
 * Money this expense represents per month, amortized across the year.
 * Use for "typical month" projections in the waterfall and dashboard
 * monthly summaries.
 */
export function monthlyAmortized(e: Pick<Expense, "amount" | "frequency">): number {
  const amt = Number(e.amount) || 0;
  switch (e.frequency) {
    case "annual":
      return amt / 12;
    case "quarterly":
      return amt / 3;
    case "monthly":
    default:
      return amt;
  }
}

export function totalMonthlyAmortized(
  expenses: Array<Pick<Expense, "amount" | "frequency">>
): number {
  return expenses.reduce((a, e) => a + monthlyAmortized(e), 0);
}

/**
 * Does this expense actually charge a payment in the given month?
 * Used for the cashflow timeline so we show real lumps on real dates.
 */
export function occursInMonth(
  e: Pick<Expense, "frequency" | "due_month">,
  monthIndex0: number // 0-11
): boolean {
  if (e.frequency === "monthly") return true;
  if (!e.due_month) return false;
  if (e.frequency === "annual") return e.due_month - 1 === monthIndex0;
  if (e.frequency === "quarterly") {
    // hits in due_month and every 3 months after
    const diff = ((monthIndex0 + 1 - e.due_month) % 3 + 3) % 3;
    return diff === 0;
  }
  return false;
}

/**
 * The dollar amount this expense contributes to the given month
 * (full lump on its month, zero otherwise).
 */
export function amountInMonth(
  e: Pick<Expense, "amount" | "frequency" | "due_month">,
  monthIndex0: number
): number {
  return occursInMonth(e, monthIndex0) ? Number(e.amount) : 0;
}

export const FREQUENCY_LABEL: Record<Expense["frequency"], string> = {
  monthly: "Monthly",
  annual: "Annual",
  quarterly: "Quarterly",
};

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
