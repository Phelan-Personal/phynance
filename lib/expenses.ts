import type { Expense, ExpenseHistory } from "@/types";

/**
 * For variable expenses: average of the most recent N months of logged
 * actuals. Falls back to e.amount (the user's baseline estimate) if
 * nothing has been logged yet.
 */
export function variableAverage(
  e: Pick<Expense, "id" | "amount">,
  history: ExpenseHistory[],
  windowMonths = 6
): number {
  const own = history
    .filter((h) => h.expense_id === e.id)
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, windowMonths);
  if (!own.length) return Number(e.amount) || 0;
  return own.reduce((a, h) => a + Number(h.amount), 0) / own.length;
}

/**
 * Money this expense represents per month, amortized across the year.
 * For 'variable' uses logged history's recent average if available.
 */
export function monthlyAmortized(
  e: Pick<Expense, "id" | "amount" | "frequency">,
  history?: ExpenseHistory[]
): number {
  const amt = Number(e.amount) || 0;
  switch (e.frequency) {
    case "annual":
      return amt / 12;
    case "quarterly":
      return amt / 3;
    case "variable":
      return history ? variableAverage(e, history) : amt;
    case "monthly":
    default:
      return amt;
  }
}

export function totalMonthlyAmortized(
  expenses: Expense[],
  history?: ExpenseHistory[]
): number {
  return expenses.reduce((a, e) => a + monthlyAmortized(e, history), 0);
}

export function occursInMonth(
  e: Pick<Expense, "frequency" | "due_month">,
  monthIndex0: number
): boolean {
  if (e.frequency === "monthly" || e.frequency === "variable") return true;
  if (!e.due_month) return false;
  if (e.frequency === "annual") return e.due_month - 1 === monthIndex0;
  if (e.frequency === "quarterly") {
    const diff = ((monthIndex0 + 1 - e.due_month) % 3 + 3) % 3;
    return diff === 0;
  }
  return false;
}

/**
 * The dollar amount this expense contributes to a specific year+month.
 * Variable: uses logged amount for that month if available, else baseline.
 * Monthly: returns its amount every month.
 * Annual/quarterly: full lump in matching month, zero otherwise.
 */
export function amountInMonth(
  e: Expense,
  year: number,
  monthIndex0: number,
  history?: ExpenseHistory[]
): { amount: number; logged: boolean } {
  if (!occursInMonth(e, monthIndex0)) return { amount: 0, logged: false };
  if (e.frequency === "variable" && history) {
    const monthKey = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
    const entry = history.find(
      (h) => h.expense_id === e.id && h.month.startsWith(monthKey)
    );
    if (entry) return { amount: Number(entry.amount), logged: true };
    return { amount: Number(e.amount) || 0, logged: false };
  }
  return { amount: Number(e.amount) || 0, logged: false };
}

export const FREQUENCY_LABEL: Record<Expense["frequency"], string> = {
  monthly: "Monthly",
  annual: "Annual",
  quarterly: "Quarterly",
  variable: "Variable",
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
