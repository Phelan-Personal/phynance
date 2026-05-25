"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react";
import type {
  IncomeHistory,
  IncomeStream,
  PendingPayment,
} from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn, fmtCurrency } from "@/lib/utils";
import { activeGrossMonthly, isStreamCurrentlyActive } from "@/lib/streams";

function lastNMonthKeys(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return out;
}

export function IncomeTotalsCard({
  streams,
  history,
  pendingPayments,
}: {
  streams: IncomeStream[];
  history: IncomeHistory[];
  pendingPayments: PendingPayment[];
}) {
  const activeMonthly = activeGrossMonthly(streams);
  const annualized = activeMonthly * 12;
  const activeStreamCount = streams.filter(isStreamCurrentlyActive).length;
  const endedStreamCount = streams.length - activeStreamCount;

  const last3 = lastNMonthKeys(3);
  const last12 = lastNMonthKeys(12);

  const totalsByMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of history) {
      const key = h.month.slice(0, 7); // YYYY-MM
      m.set(key, (m.get(key) ?? 0) + Number(h.amount));
    }
    return m;
  }, [history]);

  const last3Months = last3.map((k) => totalsByMonth.get(k) ?? 0);
  const last3NonZero = last3Months.filter((v) => v > 0);
  const last3Avg =
    last3NonZero.length > 0
      ? last3NonZero.reduce((a, v) => a + v, 0) / last3NonZero.length
      : 0;

  const last12Total = last12.reduce(
    (a, k) => a + (totalsByMonth.get(k) ?? 0),
    0
  );
  const last12NonZero = last12.filter(
    (k) => (totalsByMonth.get(k) ?? 0) > 0
  ).length;
  const last12Avg = last12NonZero > 0 ? last12Total / last12NonZero : 0;

  // Trend: last3 vs prior3
  const prior3Months = lastNMonthKeys(6)
    .slice(0, 3)
    .map((k) => totalsByMonth.get(k) ?? 0)
    .filter((v) => v > 0);
  const prior3Avg =
    prior3Months.length > 0
      ? prior3Months.reduce((a, v) => a + v, 0) / prior3Months.length
      : 0;
  const trend: "up" | "down" | "flat" =
    prior3Avg === 0
      ? "flat"
      : last3Avg > prior3Avg * 1.05
        ? "up"
        : last3Avg < prior3Avg * 0.95
          ? "down"
          : "flat";

  const outstandingAR = pendingPayments
    .filter((p) => !p.received_on)
    .reduce((a, p) => a + Number(p.amount), 0);
  const overdueAR = pendingPayments
    .filter((p) => {
      if (p.received_on || !p.expected_on) return false;
      return p.expected_on < new Date().toISOString().slice(0, 10);
    })
    .reduce((a, p) => a + Number(p.amount), 0);
  const pendingCount = pendingPayments.filter((p) => !p.received_on).length;

  return (
    <Card>
      <CardTitle>
        <span className="inline-flex items-center gap-2">
          <TrendingUp size={14} />
          Income Totals
        </span>
      </CardTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile
          label="Projected / month"
          value={`${fmtCurrency(activeMonthly)}/mo`}
          sub={`${activeStreamCount} active stream${
            activeStreamCount === 1 ? "" : "s"
          }${endedStreamCount > 0 ? ` · ${endedStreamCount} ended` : ""}`}
          tone="primary"
        />
        <Tile
          label="Annualized"
          value={fmtCurrency(annualized)}
          sub="if active streams hold steady"
        />
        <Tile
          label="Last 3 mo (actual avg)"
          value={fmtCurrency(last3Avg)}
          sub={
            last3NonZero.length === 0
              ? "log monthly actuals below"
              : `vs prior 3 mo: ${fmtCurrency(prior3Avg)}`
          }
          trend={last3NonZero.length === 0 ? undefined : trend}
        />
        <Tile
          label="Outstanding A/R"
          value={fmtCurrency(outstandingAR)}
          sub={
            outstandingAR === 0
              ? "no pending balances"
              : overdueAR > 0
                ? `${fmtCurrency(overdueAR)} overdue · ${pendingCount} pending`
                : `${pendingCount} pending`
          }
          tone={overdueAR > 0 ? "bad" : outstandingAR > 0 ? "good" : undefined}
        />
      </div>

      {last12Total > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-between text-xs">
          <span className="text-[var(--muted-foreground)]">
            Last 12 months total
          </span>
          <span className="font-mono font-medium">
            {fmtCurrency(last12Total)}{" "}
            <span className="text-[10px] text-[var(--muted-foreground)] font-normal ml-1">
              ({last12NonZero} month{last12NonZero === 1 ? "" : "s"} logged ·
              avg {fmtCurrency(last12Avg)}/mo)
            </span>
          </span>
        </div>
      )}
    </Card>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "good" | "bad";
  trend?: "up" | "down" | "flat";
}) {
  const valueCls =
    tone === "good"
      ? "text-[var(--teal)]"
      : tone === "bad"
        ? "text-[var(--coral)]"
        : tone === "primary"
          ? "text-[var(--teal-dark)]"
          : "";
  return (
    <div
      className={cn(
        "rounded-md px-3 py-2",
        tone === "primary"
          ? "bg-[var(--teal-bg)]"
          : "bg-[var(--muted)]"
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-mono text-sm font-medium flex items-center gap-1",
          valueCls
        )}
      >
        {trend === "up" && (
          <ArrowUp size={11} className="text-[var(--teal)]" />
        )}
        {trend === "down" && (
          <ArrowDown size={11} className="text-[var(--coral)]" />
        )}
        {trend === "flat" && (
          <Minus size={11} className="text-[var(--muted-foreground)]" />
        )}
        <span>{value}</span>
      </div>
      {sub && (
        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}
