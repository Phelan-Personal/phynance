"use client";

import { useMemo, useState, useTransition } from "react";
import type { IncomeStream, IncomeHistory } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { fmtCurrency } from "@/lib/utils";
import { setMonthlyAmount } from "@/app/(app)/income/actions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STREAM_COLORS = [
  "#1D9E75",
  "#3C3489",
  "#BA7517",
  "#0C447C",
  "#D85A30",
  "#0F6E56",
];

function last12Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${d.getFullYear()}-${m}-01`);
  }
  return out;
}

function fmtMonthLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

export function IncomeHistoryGrid({
  streams,
  history,
}: {
  streams: IncomeStream[];
  history: IncomeHistory[];
}) {
  const months = useMemo(last12Months, []);
  const byKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of history) {
      map.set(`${h.stream_id}|${h.month}`, Number(h.amount));
    }
    return map;
  }, [history]);

  const chartData = useMemo(
    () =>
      months.map((m) => {
        const row: Record<string, number | string> = { month: fmtMonthLabel(m) };
        for (const s of streams) {
          row[s.name] = byKey.get(`${s.id}|${m}`) ?? 0;
        }
        return row;
      }),
    [months, streams, byKey]
  );

  if (streams.length === 0) {
    return (
      <Card>
        <CardTitle>Income History</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Add an income stream to start logging monthly actuals.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Income History (last 12 months)</CardTitle>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--muted-foreground)]">
                <th className="text-left py-2 pr-3 font-medium">Month</th>
                {streams.map((s) => (
                  <th
                    key={s.id}
                    className="text-right py-2 px-2 font-medium whitespace-nowrap"
                  >
                    {s.name}
                  </th>
                ))}
                <th className="text-right py-2 pl-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const total = streams.reduce(
                  (a, s) => a + (byKey.get(`${s.id}|${m}`) ?? 0),
                  0
                );
                return (
                  <tr
                    key={m}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="py-1.5 pr-3 text-[var(--muted-foreground)]">
                      {fmtMonthLabel(m)}
                    </td>
                    {streams.map((s) => (
                      <td key={s.id} className="py-1 px-1">
                        <EditableCell
                          streamId={s.id}
                          month={m}
                          initial={byKey.get(`${s.id}|${m}`) ?? 0}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 pl-2 text-right font-mono">
                      {fmtCurrency(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--border)] font-medium">
                <td className="py-2 pr-3">Avg</td>
                {streams.map((s) => {
                  const vals = months
                    .map((m) => byKey.get(`${s.id}|${m}`) ?? 0)
                    .filter((v) => v > 0);
                  const avg =
                    vals.length > 0
                      ? vals.reduce((a, v) => a + v, 0) / vals.length
                      : 0;
                  return (
                    <td
                      key={s.id}
                      className="py-2 px-2 text-right font-mono"
                    >
                      {fmtCurrency(avg)}
                    </td>
                  );
                })}
                <td className="py-2 pl-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle>Monthly Income by Stream</CardTitle>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="month"
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
                formatter={(v) => fmtCurrency(Number(v))}
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 11,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                iconSize={8}
              />
              {streams.map((s, i) => (
                <Bar
                  key={s.id}
                  dataKey={s.name}
                  stackId="a"
                  fill={STREAM_COLORS[i % STREAM_COLORS.length]}
                  radius={i === streams.length - 1 ? [3, 3, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function EditableCell({
  streamId,
  month,
  initial,
}: {
  streamId: string;
  month: string;
  initial: number;
}) {
  const [value, setValue] = useState(initial > 0 ? String(initial) : "");
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="number"
      value={value}
      step="0.01"
      min="0"
      disabled={isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={(e) => {
        const n = parseFloat(e.target.value) || 0;
        if (n === initial) return;
        startTransition(async () => {
          await setMonthlyAmount(streamId, month, n);
        });
      }}
      className="!py-1 !text-xs text-right font-mono"
      placeholder="—"
    />
  );
}
