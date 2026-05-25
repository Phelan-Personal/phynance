"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  FinancialSettings,
  IncomeStream,
  Debt,
  Expense,
  ExpenseHistory,
} from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, fmtCurrency, fmtPct } from "@/lib/utils";
import { calcAutoExtra } from "@/lib/calculations";
import { monthlyAmortized } from "@/lib/expenses";
import { activeGrossMonthly, isStreamCurrentlyActive } from "@/lib/streams";
import { saveSettings } from "@/app/(app)/income/actions";

export function IncomeSettingsAndCashflow({
  settings,
  streams,
  debts,
  expenses,
  expenseHistory,
}: {
  settings: FinancialSettings;
  streams: IncomeStream[];
  debts: Debt[];
  expenses: Expense[];
  expenseHistory: ExpenseHistory[];
}) {
  const [draw, setDraw] = useState(Number(settings.personal_draw) || 0);
  const [se, setSe] = useState(Number(settings.se_tax_rate) || 15.3);
  const [it, setIt] = useState(Number(settings.income_tax_rate) || 22);
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">(
    settings.payoff_strategy
  );
  const [extraMode, setExtraMode] = useState<"auto" | "manual">(
    settings.extra_payment_override === null ? "auto" : "manual"
  );
  const [extraManual, setExtraManual] = useState(
    Number(settings.extra_payment_override) || 0
  );
  const [cash, setCash] = useState(Number(settings.cash_on_hand) || 0);

  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const grossMonthly = useMemo(() => activeGrossMonthly(streams), [streams]);
  const activeStreams = useMemo(
    () => streams.filter(isStreamCurrentlyActive),
    [streams]
  );
  const bizExpenses = expenses
    .filter((e) => e.type === "business")
    .reduce((a, e) => a + monthlyAmortized(e, expenseHistory), 0);
  const persExpenses = expenses
    .filter((e) => e.type === "personal")
    .reduce((a, e) => a + monthlyAmortized(e, expenseHistory), 0);
  const bizDebtMins = debts
    .filter((d) => d.type === "business" && !d.is_paid_off)
    .reduce((a, d) => a + Number(d.min_payment), 0);
  const persDebtMins = debts
    .filter((d) => d.type === "personal" && !d.is_paid_off)
    .reduce((a, d) => a + Number(d.min_payment), 0);

  const seAmt = grossMonthly * (se / 100);
  const itAmt = grossMonthly * (it / 100);
  const netAfterTax = grossMonthly - seAmt - itAmt;
  const bizRetained = netAfterTax - bizExpenses - bizDebtMins - draw;
  const persRemaining = draw - persDebtMins - persExpenses;
  const totalForExtra = bizRetained + persRemaining;

  const autoExtra = calcAutoExtra({
    grossMonthly,
    draw,
    seTaxRate: se,
    incomeTaxRate: it,
    bizExpenses,
    persExpenses,
    bizDebtMins,
    persDebtMins,
  });
  const effectiveExtra = extraMode === "auto" ? autoExtra : extraManual;

  const save = () => {
    const fd = new FormData();
    fd.set("personal_draw", String(draw));
    fd.set("se_tax_rate", String(se));
    fd.set("income_tax_rate", String(it));
    fd.set("payoff_strategy", strategy);
    fd.set("extra_payment_mode", extraMode);
    fd.set("extra_payment_override", String(extraManual));
    fd.set("cash_on_hand", String(cash));
    startTransition(async () => {
      await saveSettings(fd);
      setSavedAt(Date.now());
    });
  };

  const savedRecently = savedAt && Date.now() - savedAt < 4000;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          right={
            <div className="flex items-center gap-2">
              {isPending && (
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  Saving…
                </span>
              )}
              {!isPending && savedRecently && (
                <span className="text-[11px] text-[var(--teal-dark)]">
                  Saved
                </span>
              )}
              <Button onClick={save} disabled={isPending}>
                Save
              </Button>
            </div>
          }
        >
          Financial Settings
        </CardTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <NumField
            label="Cash on hand (starting balance for /cashflow — can be negative)"
            value={cash}
            onChange={setCash}
            onBlur={save}
            allowNegative
          />
          <NumField
            label="Personal draw ($/mo)"
            value={draw}
            onChange={setDraw}
            onBlur={save}
          />
          <NumField
            label="SE tax rate (%)"
            value={se}
            onChange={setSe}
            onBlur={save}
            step={0.1}
          />
          <NumField
            label="Income tax rate (%) — fed + state"
            value={it}
            onChange={setIt}
            onBlur={save}
            step={0.1}
          />
          <div>
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              Payoff strategy
            </div>
            <div className="flex rounded-md border border-[var(--border)] p-0.5">
              {(["avalanche", "snowball"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStrategy(s);
                    setTimeout(save, 0);
                  }}
                  className={cn(
                    "flex-1 py-1 text-xs rounded-sm capitalize transition-colors",
                    strategy === s
                      ? "bg-[var(--muted)] font-medium"
                      : "text-[var(--muted-foreground)]"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              Extra payment
            </div>
            <div className="flex rounded-md border border-[var(--border)] p-0.5 mb-2">
              {(["auto", "manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setExtraMode(m);
                    setTimeout(save, 0);
                  }}
                  className={cn(
                    "flex-1 py-1 text-xs rounded-sm capitalize transition-colors",
                    extraMode === m
                      ? "bg-[var(--muted)] font-medium"
                      : "text-[var(--muted-foreground)]"
                  )}
                >
                  {m === "auto" ? "Auto-calculate" : "Manual override"}
                </button>
              ))}
            </div>
            {extraMode === "manual" ? (
              <input
                type="number"
                value={extraManual}
                step="0.01"
                min="0"
                onChange={(e) =>
                  setExtraManual(parseFloat(e.target.value) || 0)
                }
                onBlur={save}
              />
            ) : (
              <div className="text-xs text-[var(--muted-foreground)]">
                Auto-calc:{" "}
                <span className="font-mono text-[var(--teal-dark)] font-medium">
                  {fmtCurrency(autoExtra)}/mo
                </span>{" "}
                available after all obligations
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Monthly Cash Flow</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionLabel>Business side</SectionLabel>
            <FlowRow label="All income streams" value={grossMonthly} />
            {activeStreams.length > 0 && (
              <div className="pl-3 border-l border-[var(--border)] ml-1 mb-2 space-y-0.5">
                {activeStreams.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between text-[11px] text-[var(--muted-foreground)]"
                  >
                    <span className="truncate pr-2">{s.name}</span>
                    <span className="font-mono">
                      {fmtCurrency(Number(s.avg_monthly))}
                    </span>
                  </div>
                ))}
                {streams.length > activeStreams.length && (
                  <div className="text-[10px] text-[var(--muted-foreground)] italic">
                    + {streams.length - activeStreams.length} ended stream
                    {streams.length - activeStreams.length === 1 ? "" : "s"}{" "}
                    (not counted)
                  </div>
                )}
              </div>
            )}
            <FlowRow label={`SE tax (${fmtPct(se)})`} value={-seAmt} negative />
            <FlowRow
              label={`Income tax (${fmtPct(it)})`}
              value={-itAmt}
              negative
            />
            <FlowRow label="Net after tax" value={netAfterTax} bold />
            <FlowRow
              label="Business operating expenses"
              value={-bizExpenses}
              negative
            />
            <FlowRow
              label="Business debt minimums"
              value={-bizDebtMins}
              negative
            />
            <FlowRow label="Personal draw" value={-draw} negative />
            <FlowRow
              label="Business retained"
              value={bizRetained}
              bold
              tone={bizRetained >= 0 ? "good" : "bad"}
            />
          </div>
          <div>
            <SectionLabel>Personal side</SectionLabel>
            <FlowRow label="Draw received" value={draw} />
            <FlowRow
              label="Personal debt minimums"
              value={-persDebtMins}
              negative
            />
            <FlowRow
              label="Personal expenses"
              value={-persExpenses}
              negative
            />
            <FlowRow
              label="Personal remaining"
              value={persRemaining}
              bold
              tone={persRemaining >= 0 ? "good" : "bad"}
            />
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <FlowRow
                label="Total available for extra debt"
                value={totalForExtra}
                bold
                tone={totalForExtra > 0 ? "good" : "bad"}
              />
              {extraMode === "manual" && (
                <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Manual override active:{" "}
                  <span className="font-mono">
                    {fmtCurrency(effectiveExtra)}/mo
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  onBlur,
  step = 1,
  allowNegative = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  onBlur: () => void;
  step?: number;
  allowNegative?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
        {label}
      </div>
      <input
        type="number"
        value={value}
        step={step}
        min={allowNegative ? undefined : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        onBlur={onBlur}
      />
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
      {children}
    </div>
  );
}

function FlowRow({
  label,
  value,
  negative,
  bold,
  tone,
}: {
  label: string;
  value: number;
  negative?: boolean;
  bold?: boolean;
  tone?: "good" | "bad";
}) {
  const cls = tone === "good" ? "text-[var(--teal)]" : tone === "bad" ? "text-[var(--coral)]" : "";
  return (
    <div
      className={cn(
        "flex justify-between py-1 text-xs",
        bold &&
          "font-medium border-t border-[var(--border)] pt-1.5 mt-0.5"
      )}
    >
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={cn("font-mono", cls)}>
        {negative && value !== 0 ? "− " : ""}
        {fmtCurrency(Math.abs(value))}
      </span>
    </div>
  );
}
