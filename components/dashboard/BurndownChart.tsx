"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { fmtCurrency, fmtMonthYear, fmtShortMonthYear } from "@/lib/utils";

export function BurndownChart({
  minOnly,
  strategy,
}: {
  minOnly: number[];
  strategy: number[];
}) {
  const len = Math.max(minOnly.length, strategy.length, 2);
  const data = Array.from({ length: len }, (_, i) => ({
    month: i,
    label: fmtShortMonthYear(i),
    minOnly: minOnly[i] ?? 0,
    strategy: strategy[i] ?? 0,
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v % 6 === 0 ? fmtShortMonthYear(Number(v)) : ""
            }
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
              return (
                <div
                  className="rounded-md border bg-[var(--background)] px-2 py-1.5 text-xs shadow"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="font-medium mb-1">
                    {fmtMonthYear(Number(label))}
                  </div>
                  {payload.map((p) => (
                    <div
                      key={p.dataKey as string}
                      className="flex items-center gap-2"
                    >
                      <span
                        style={{
                          width: 8,
                          height: 2,
                          background: p.color as string,
                        }}
                      />
                      <span className="text-[var(--muted-foreground)]">
                        {p.dataKey === "minOnly" ? "Min only" : "With strategy"}
                      </span>
                      <span className="font-mono ml-auto">
                        {fmtCurrency(Number(p.value))}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="minOnly"
            stroke="#B4B2A9"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="strategy"
            stroke="#1D9E75"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
