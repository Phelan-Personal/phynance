"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Receipt,
  Banknote,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn, fmtCurrency } from "@/lib/utils";
import {
  dailyBalances,
  daysInMonth,
  eventsForMonth,
  lowestPoint,
  monthLabelFromIndex,
  type CashflowEvent,
} from "@/lib/cashflow";
import type {
  Debt,
  Expense,
  ExpenseHistory,
  ExpenseTransaction,
  IncomeHistory,
  IncomeStream,
} from "@/types";

export function CashflowMonthView({
  startingBalance,
  streams,
  expenses,
  debts,
  transactions,
  loggedIncome,
  expenseHistory,
}: {
  startingBalance: number;
  streams: IncomeStream[];
  expenses: Expense[];
  debts: Debt[];
  transactions: ExpenseTransaction[];
  loggedIncome: IncomeHistory[];
  expenseHistory: ExpenseHistory[];
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());

  const events = useMemo(
    () =>
      eventsForMonth({
        year,
        monthIndex,
        streams,
        expenses,
        debts,
        transactions,
        loggedIncome,
        expenseHistory,
      }),
    [
      year,
      monthIndex,
      streams,
      expenses,
      debts,
      transactions,
      loggedIncome,
      expenseHistory,
    ]
  );

  const dim = daysInMonth(year, monthIndex);
  const points = useMemo(
    () => dailyBalances(events, startingBalance, dim),
    [events, startingBalance, dim]
  );
  const low = lowestPoint(points);
  const finalBalance = points[points.length - 1]?.endBalance ?? startingBalance;
  const totalIn = events
    .filter((e) => e.amount > 0)
    .reduce((a, e) => a + e.amount, 0);
  const totalOut = events
    .filter((e) => e.amount < 0)
    .reduce((a, e) => a + e.amount, 0);
  const netForMonth = totalIn + totalOut; // outflows are negative

  const changeMonth = (delta: number) => {
    const newM = monthIndex + delta;
    if (newM < 0) {
      setMonthIndex(11);
      setYear((y) => y - 1);
    } else if (newM > 11) {
      setMonthIndex(0);
      setYear((y) => y + 1);
    } else {
      setMonthIndex(newM);
    }
  };

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CashflowEvent[]>();
    for (const e of events) {
      const arr = map.get(e.day) ?? [];
      arr.push(e);
      map.set(e.day, arr);
    }
    return map;
  }, [events]);

  const dangerDay = low && low.balance < 0 ? low.day : null;

  const chartData = points.map((p) => ({
    day: p.day,
    label: p.day,
    balance: Math.round(p.endBalance),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          right={
            <div className="flex items-center gap-1">
              <button
                onClick={() => changeMonth(-1)}
                className="rounded-md border border-[var(--border)] px-2 py-1 hover:bg-[var(--muted)]"
                aria-label="Previous month"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="px-3 py-1 text-sm font-medium font-mono min-w-[140px] text-center">
                {monthLabelFromIndex(year, monthIndex)}
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="rounded-md border border-[var(--border)] px-2 py-1 hover:bg-[var(--muted)]"
                aria-label="Next month"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => {
                  setYear(now.getFullYear());
                  setMonthIndex(now.getMonth());
                }}
                className="ml-2 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--muted)]"
              >
                Today
              </button>
            </div>
          }
        >
          Monthly Cashflow
        </CardTitle>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <Cell
            label="Starting cash"
            value={fmtCurrency(startingBalance)}
            sub="set on /income"
          />
          <Cell
            label="Inflows"
            value={fmtCurrency(totalIn)}
            tone="good"
          />
          <Cell
            label="Outflows"
            value={fmtCurrency(Math.abs(totalOut))}
            tone="bad"
          />
          <Cell
            label="End of month"
            value={fmtCurrency(finalBalance)}
            tone={finalBalance >= 0 ? "good" : "bad"}
            sub={`Net ${netForMonth >= 0 ? "+" : ""}${fmtCurrency(netForMonth)}`}
          />
        </div>

        {low && low.balance < 0 && (
          <div className="mb-4 rounded-md border border-[color:var(--coral)]/30 bg-[var(--coral-bg)] px-3 py-2 text-xs text-[var(--coral)] flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              You go negative on{" "}
              <strong>day {low.day}</strong> (
              {monthLabelFromIndex(year, monthIndex).split(" ")[0]} {low.day}).
              Lowest point:{" "}
              <strong className="font-mono">{fmtCurrency(low.balance)}</strong>
              . You need{" "}
              <strong className="font-mono">
                {fmtCurrency(Math.abs(low.balance))}
              </strong>{" "}
              of bridge cash before then.
            </span>
          </div>
        )}

        {low && low.balance >= 0 && finalBalance > startingBalance && (
          <div className="mb-4 rounded-md border border-[color:var(--teal)]/30 bg-[var(--teal-bg)] px-3 py-2 text-xs text-[var(--teal-dark)] flex items-start gap-2">
            <TrendingUp size={14} className="mt-0.5 shrink-0" />
            <span>
              You stay positive all month. Net{" "}
              <strong className="font-mono">+{fmtCurrency(netForMonth)}</strong>{" "}
              by the last day.
            </span>
          </div>
        )}

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="balGood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#1D9E75" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={Math.ceil(dim / 10)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) =>
                  Math.abs(Number(v)) >= 1000
                    ? `$${(Number(v) / 1000).toFixed(1)}k`
                    : `$${Math.round(Number(v))}`
                }
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              {dangerDay && (
                <ReferenceLine
                  x={dangerDay}
                  stroke="#D85A30"
                  strokeWidth={1}
                  label={{
                    value: `day ${dangerDay}`,
                    position: "top",
                    fill: "#D85A30",
                    fontSize: 10,
                  }}
                />
              )}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const bal = Number(payload[0].value);
                  const dayEvents = eventsByDay.get(Number(label)) ?? [];
                  return (
                    <div
                      className="rounded-md border bg-[var(--background)] px-2 py-1.5 text-xs max-w-[240px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="font-medium mb-1">
                        {monthLabelFromIndex(year, monthIndex).split(" ")[0]}{" "}
                        {label}
                      </div>
                      <div
                        className={cn(
                          "font-mono mb-1",
                          bal < 0 ? "text-[var(--coral)]" : "text-[var(--teal)]"
                        )}
                      >
                        End of day: {fmtCurrency(bal)}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="space-y-0.5 border-t border-[var(--border)] pt-1">
                          {dayEvents.map((e) => (
                            <div
                              key={e.id}
                              className="flex justify-between gap-2"
                            >
                              <span className="truncate text-[var(--muted-foreground)]">
                                {e.name}
                              </span>
                              <span
                                className={cn(
                                  "font-mono shrink-0",
                                  e.amount > 0
                                    ? "text-[var(--teal)]"
                                    : "text-[var(--coral)]"
                                )}
                              >
                                {e.amount > 0 ? "+" : "−"}
                                {fmtCurrency(Math.abs(e.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#1D9E75"
                fill="url(#balGood)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle>Day-by-day events</CardTitle>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-4">
            No events for this month. Add due dates to debts/expenses and pay
            days to income streams so events show up here.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {[...eventsByDay.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([day, items]) => {
                const dayPoint = points.find((p) => p.day === day);
                return (
                  <li key={day} className="py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium">
                        {monthLabelFromIndex(year, monthIndex).split(" ")[0]}{" "}
                        {day}
                      </div>
                      <div
                        className={cn(
                          "text-[11px] font-mono",
                          (dayPoint?.endBalance ?? 0) < 0
                            ? "text-[var(--coral)]"
                            : "text-[var(--muted-foreground)]"
                        )}
                      >
                        End of day: {fmtCurrency(dayPoint?.endBalance ?? 0)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {items.map((e) => (
                        <EventRow key={e.id} event={e} />
                      ))}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
  sub?: string;
}) {
  const cls =
    tone === "good"
      ? "text-[var(--teal)]"
      : tone === "bad"
        ? "text-[var(--coral)]"
        : "";
  return (
    <div className="rounded-md bg-[var(--muted)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-sm font-medium", cls)}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: CashflowEvent }) {
  const Icon =
    event.kind === "income"
      ? Banknote
      : event.kind === "debt"
        ? CreditCard
        : event.kind === "transaction"
          ? Wallet
          : Receipt;
  const iconColor =
    event.amount > 0
      ? "var(--teal)"
      : event.kind === "debt"
        ? "var(--amber)"
        : "var(--coral)";
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon size={12} style={{ color: iconColor }} aria-hidden />
      <span className="flex-1 min-w-0 truncate">{event.name}</span>
      {event.isProjected && (
        <span className="text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">
          projected
        </span>
      )}
      <span
        className={cn(
          "font-mono shrink-0",
          event.amount > 0 ? "text-[var(--teal)]" : "text-[var(--coral)]"
        )}
      >
        {event.amount > 0 ? "+" : "−"}
        {fmtCurrency(Math.abs(event.amount))}
      </span>
    </div>
  );
}
