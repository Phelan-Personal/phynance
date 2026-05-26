import type {
  Debt,
  Expense,
  ExpenseHistory,
  ExpenseTransaction,
  IncomeHistory,
  IncomeStream,
  PendingPayment,
  RecurringRevenue,
} from "@/types";
import { amountInMonth } from "./expenses";

export type CashflowEventKind = "income" | "expense" | "debt" | "transaction";

export type CashflowEvent = {
  id: string;
  day: number;
  kind: CashflowEventKind;
  name: string;
  amount: number; // signed: positive = inflow, negative = outflow
  source: "recurring" | "logged";
  category?: string | null;
  isProjected: boolean;
};

export function parsePayDays(raw: string | null | undefined): number[] {
  if (!raw) return [1];
  const days = String(raw)
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
  return days.length > 0 ? days.sort((a, b) => a - b) : [1];
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function monthKeyFor(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function eventsForMonth(opts: {
  year: number;
  monthIndex: number; // 0-11
  streams: IncomeStream[];
  expenses: Expense[];
  debts: Debt[];
  transactions: ExpenseTransaction[];
  loggedIncome: IncomeHistory[];
  expenseHistory?: ExpenseHistory[];
  pendingPayments?: PendingPayment[];
  recurringRevenue?: RecurringRevenue[];
}): CashflowEvent[] {
  const {
    year,
    monthIndex,
    streams,
    expenses,
    debts,
    transactions,
    loggedIncome,
    expenseHistory = [],
    pendingPayments = [],
    recurringRevenue = [],
  } = opts;
  const events: CashflowEvent[] = [];
  const dim = daysInMonth(year, monthIndex);
  const monthKey = monthKeyFor(year, monthIndex);
  const monthIso = `${monthKey}-01`;

  const clamp = (d: number) => Math.min(Math.max(1, d), dim);

  // ────── Income from streams (logged or projected via pay_days) ──────
  for (const s of streams) {
    if (s.start_month && monthIso < s.start_month) continue;
    if (s.end_month && monthIso > s.end_month) continue;

    const payDays = parsePayDays(s.pay_days);

    const loggedForStream = loggedIncome.filter(
      (h) => h.stream_id === s.id && h.month.startsWith(monthKey)
    );
    const loggedTotal = loggedForStream.reduce(
      (a, h) => a + Number(h.amount),
      0
    );

    const hasLogged = loggedTotal > 0;
    const monthlyTotal = hasLogged ? loggedTotal : Number(s.avg_monthly) || 0;
    if (monthlyTotal === 0) continue;

    const per = monthlyTotal / payDays.length;
    payDays.forEach((d, i) => {
      events.push({
        id: `inc-${s.id}-${d}-${i}`,
        day: clamp(d),
        kind: "income",
        name: s.name,
        amount: per,
        source: hasLogged ? "logged" : "recurring",
        isProjected: !hasLogged,
      });
    });
  }

  // ────── Recurring revenue contracts (per-client subscriptions) ──────
  // Each contract emits an income event on its due day, scoped to its
  // active range (start_month / end_month).
  const monthFirstIso = `${monthKey}-01`;
  for (const r of recurringRevenue) {
    if (r.is_archived) continue;
    if (r.start_month && monthFirstIso < r.start_month) continue;
    if (r.end_month && monthFirstIso > r.end_month) continue;
    const day = clamp(r.due_day ?? 1);
    events.push({
      id: `recur-${r.id}`,
      day,
      kind: "income",
      name: r.client_name ? `${r.name} (${r.client_name})` : r.name,
      amount: Number(r.amount),
      source: "recurring",
      category: r.category,
      isProjected: true,
    });
  }

  // ────── Recurring expenses (full lump on due_day, only in months they hit) ──────
  for (const e of expenses) {
    const { amount: amt, logged } = amountInMonth(
      e,
      year,
      monthIndex,
      expenseHistory
    );
    if (amt === 0) continue;
    const day = clamp(e.due_day ?? 1);
    const suffix =
      e.frequency === "monthly"
        ? ""
        : e.frequency === "variable"
          ? logged
            ? " (logged)"
            : " (estimate)"
          : ` (${e.frequency})`;
    events.push({
      id: `exp-${e.id}`,
      day,
      kind: "expense",
      name: `${e.name}${suffix}`,
      amount: -amt,
      source: logged ? "logged" : "recurring",
      category: e.category,
      isProjected: !logged,
    });
  }

  // ────── Debt minimums ──────
  for (const d of debts) {
    if (d.is_paid_off) continue;
    const day = clamp(d.due_day ?? 15);
    events.push({
      id: `debt-${d.id}`,
      day,
      kind: "debt",
      name: `${d.name} (min)`,
      amount: -Number(d.min_payment),
      source: "recurring",
      isProjected: true,
    });
  }

  // ────── Pending payments (A/R) ──────
  // Unpaid payments expected in this month appear on their expected day.
  // Unpaid payments that are overdue (expected_on in past) AND we're viewing
  // the current month land on day 1 as a carryover so the cashflow still
  // reflects the expected inflow.
  const todayIsoStr = new Date().toISOString().slice(0, 10);
  const todayMonthIso = todayIsoStr.slice(0, 7);
  for (const pp of pendingPayments) {
    if (pp.received_on) continue;
    if (!pp.expected_on) continue;
    const ppMonthIso = pp.expected_on.slice(0, 7);
    if (ppMonthIso === monthKey) {
      const day = clamp(Number(pp.expected_on.slice(8, 10)) || 1);
      events.push({
        id: `pp-${pp.id}`,
        day,
        kind: "income",
        name: `${pp.client_name}${pp.description ? " — " + pp.description : ""}`,
        amount: Number(pp.amount),
        source: "recurring",
        isProjected: true,
      });
    } else if (
      pp.expected_on < todayIsoStr &&
      monthKey === todayMonthIso
    ) {
      // Overdue: carry into current month at day 1
      events.push({
        id: `pp-${pp.id}-overdue`,
        day: 1,
        kind: "income",
        name: `${pp.client_name} (overdue)`,
        amount: Number(pp.amount),
        source: "recurring",
        isProjected: true,
      });
    }
  }

  // ────── Logged transactions in this month ──────
  for (const t of transactions) {
    if (!t.occurred_on.startsWith(monthKey)) continue;
    const day = Number(t.occurred_on.slice(8, 10)) || 1;
    events.push({
      id: `txn-${t.id}`,
      day: clamp(day),
      kind: "transaction",
      name: t.name,
      amount: -Number(t.amount),
      source: "logged",
      category: t.category,
      isProjected: false,
    });
  }

  return events.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    // On same day, inflows before outflows (cash arrives before bills clear)
    if (a.amount !== b.amount)
      return Math.sign(b.amount) - Math.sign(a.amount);
    return a.name.localeCompare(b.name);
  });
}

export type DailyBalancePoint = {
  day: number;
  inflow: number;
  outflow: number;
  endBalance: number;
};

export function dailyBalances(
  events: CashflowEvent[],
  startingBalance: number,
  monthDays: number
): DailyBalancePoint[] {
  let bal = startingBalance;
  const points: DailyBalancePoint[] = [];
  let cursor = 0;
  for (let d = 1; d <= monthDays; d++) {
    let inflow = 0;
    let outflow = 0;
    while (cursor < events.length && events[cursor].day === d) {
      const a = events[cursor].amount;
      if (a >= 0) inflow += a;
      else outflow += a;
      bal += a;
      cursor++;
    }
    points.push({ day: d, inflow, outflow, endBalance: bal });
  }
  return points;
}

export function lowestPoint(
  points: DailyBalancePoint[]
): { day: number; balance: number } | null {
  if (!points.length) return null;
  let min = points[0];
  for (const p of points) {
    if (p.endBalance < min.endBalance) min = p;
  }
  return { day: min.day, balance: min.endBalance };
}

export function monthLabelFromIndex(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
