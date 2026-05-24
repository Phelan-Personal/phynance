"use client";

import { useState } from "react";
import type { FinancialSettings } from "@/types";
import type { CalcDebt } from "@/lib/calculations";
import { HouseGoalForm } from "./HouseGoalForm";
import { HouseGoalDashboard } from "./HouseGoalDashboard";

export function HouseGoalShell({
  settings,
  debts,
  grossMonthly,
  totalDebtMins,
  effectiveExtra,
  revenueTrend,
}: {
  settings: FinancialSettings;
  debts: CalcDebt[];
  grossMonthly: number;
  totalDebtMins: number;
  effectiveExtra: number;
  revenueTrend: "up" | "down" | "flat";
}) {
  const hasGoal = !!settings.house_target_price;
  const [editing, setEditing] = useState(!hasGoal);

  if (editing) {
    return (
      <HouseGoalForm
        settings={settings}
        existing={hasGoal}
      />
    );
  }

  return (
    <HouseGoalDashboard
      settings={settings}
      debts={debts}
      grossMonthly={grossMonthly}
      totalDebtMins={totalDebtMins}
      effectiveExtra={effectiveExtra}
      revenueTrend={revenueTrend}
      onEdit={() => setEditing(true)}
    />
  );
}
