"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fmtCurrency } from "@/lib/utils";
import { lastNMonthKeys, monthLabel, monthKey } from "@/lib/dates";
import type { IncomeHistory, ExpenseTransaction, IncomeStream } from "@/types";

export function CashflowHistoryChart({
  income,
  transactions,
  streams,
  recurringMonthlyExpenseEstimate,
  monthlyDebtMins,
}: {
  income: IncomeHistory[];
  transactions: ExpenseTransaction[];
  streams: IncomeStream[];
  recurringMonthlyExpenseEstimate: number;
  monthlyDebtMins: number;
}) {
  const data = useMemo(() => {
    const months = lastNMonthKeys(12);
    const incomeByMonth = new Map<string, number>();
    for (const h of income) {
      const k = monthKey(h.month);
      incomeByMonth.set(k, (incomeByMonth.get(k) ?? 0) + Number(h.amount));
    }
    const expensesByMonth = new Map<string, number>();
    for (const t of transactions) {
      const k = monthKey(t.occurred_on);
      expensesByMonth.set(
        k,
        (expensesByMonth.get(k) ?? 0) + Number(t.amount)
      );
    }
    return months.map((m) => {
      const inc = incomeByMonth.get(m) ?? 0;
      // Fall back to sum of active stream avgs when no history is logged for this month.
      const monthFirst = `${m}-01`;
      const projectedIncome = streams.reduce((acc, s) => {
        if (s.start_month && monthFirst < s.start_month) return acc;
        if (s.end_month && monthFirst > s.end_month) return acc;
        return acc + Number(s.avg_monthly || 0);
      }, 0);
      const usedIncome = inc > 0 ? inc : projectedIncome;
      const txnExp = expensesByMonth.get(m) ?? 0;
      const totalOut =
        txnExp + recurringMonthlyExpenseEstimate + monthlyDebtMins;
      return {
        month: m,
        label: monthLabel(m),
        income: Math.round(usedIncome),
        incomeProjected: inc === 0 && projectedIncome > 0,
        expenses: Math.round(totalOut),
        transactionsOnly: Math.round(txnExp),
        net: Math.round(usedIncome - totalOut),
      };
    });
  }, [
    income,
    transactions,
    streams,
    recurringMonthlyExpenseEstimate,
    monthlyDebtMins,
  ]);

  const hasAnyIncome = data.some((d) => d.income > 0);
  const hasAnyTransactions = data.some((d) => d.transactionsOnly > 0);
  const someProjected = data.some((d) => d.incomeProjected);

  if (!hasAnyIncome && !hasAnyTransactions) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
        Log monthly income on /income or import transactions on /bank-scan to
        see your real cashflow over time.
      </p>
    );
  }

  return (
    <div>
      {someProjected && (
        <div className="text-[10px] text-[var(--muted-foreground)] mb-1">
          Months without logged income use each stream's average monthly amount
          as a projection.
        </div>
      )}
      <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const inc = payload.find((p) => p.dataKey === "income");
              const exp = payload.find((p) => p.dataKey === "expenses");
              const net = payload.find((p) => p.dataKey === "net");
              return (
                <div
                  className="rounded-md border bg-[var(--background)] px-2 py-1.5 text-xs"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="font-medium mb-1">{label}</div>
                  {inc && (
                    <Row
                      color="var(--teal)"
                      label="Income"
                      value={Number(inc.value)}
                    />
                  )}
                  {exp && (
                    <Row
                      color="var(--coral)"
                      label="Outflow (est.)"
                      value={Number(exp.value)}
                    />
                  )}
                  {net && (
                    <Row
                      color="#666"
                      label="Net"
                      value={Number(net.value)}
                      bold
                    />
                  )}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
          <Bar dataKey="income" name="Income" fill="#1D9E75" radius={[3, 3, 0, 0]} />
          <Bar
            dataKey="expenses"
            name="Outflow"
            fill="#D85A30"
            radius={[3, 3, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="net"
            name="Net"
            stroke="#171717"
            strokeWidth={1.5}
            dot={{ r: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

function Row({
  color,
  label,
  value,
  bold,
}: {
  color: string;
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ width: 8, height: 2, background: color }} />
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span
        className={`ml-auto font-mono ${bold ? "font-medium" : ""}`}
        style={
          bold
            ? {
                color: value >= 0 ? "var(--teal)" : "var(--coral)",
              }
            : undefined
        }
      >
        {fmtCurrency(value)}
      </span>
    </div>
  );
}
