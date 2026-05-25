import type { Asset, Goal, GoalKind } from "@/types";
import { assetValue } from "@/types";

export const GOAL_KIND_LABEL: Record<GoalKind, string> = {
  emergency_fund: "Emergency fund",
  retirement: "Retirement",
  savings: "Savings",
  investment: "Investment",
  debt_payoff: "Debt payoff",
  custom: "Custom",
};

export type GoalProgress = {
  goal: Goal;
  currentAmount: number;       // accounting for linked asset if any
  amountRemaining: number;
  monthsRemaining: number | null;  // null if no target_date
  monthlyNeeded: number;            // override or computed
  progressPct: number;              // 0-100
  isDone: boolean;
  isOverdue: boolean;
  source: "manual" | "linked";
};

export function monthsBetweenTodayAnd(targetDateIso: string): number {
  const today = new Date();
  const target = new Date(targetDateIso);
  const months =
    (target.getFullYear() - today.getFullYear()) * 12 +
    (target.getMonth() - today.getMonth());
  return months;
}

export function computeGoalProgress(
  goal: Goal,
  assets: Asset[]
): GoalProgress {
  const linked = goal.linked_asset_id
    ? assets.find((a) => a.id === goal.linked_asset_id)
    : null;
  const currentAmount = linked
    ? assetValue(linked)
    : Number(goal.current_amount) || 0;
  const target = Number(goal.target_amount) || 0;
  const amountRemaining = Math.max(0, target - currentAmount);
  const progressPct =
    target > 0 ? Math.min(100, (currentAmount / target) * 100) : 0;
  const isDone = currentAmount >= target && target > 0;

  let monthsRemaining: number | null = null;
  let isOverdue = false;
  if (goal.target_date) {
    monthsRemaining = monthsBetweenTodayAnd(goal.target_date);
    if (monthsRemaining < 0 && !isDone) {
      isOverdue = true;
      monthsRemaining = 0;
    }
  }

  let monthlyNeeded = 0;
  if (goal.monthly_contribution_override !== null) {
    monthlyNeeded = Number(goal.monthly_contribution_override);
  } else if (isDone) {
    monthlyNeeded = 0;
  } else if (monthsRemaining !== null && monthsRemaining > 0) {
    monthlyNeeded = amountRemaining / monthsRemaining;
  } else if (monthsRemaining === 0) {
    // Due now (or overdue) — flag the whole remaining
    monthlyNeeded = amountRemaining;
  }

  return {
    goal,
    currentAmount,
    amountRemaining,
    monthsRemaining,
    monthlyNeeded,
    progressPct,
    isDone,
    isOverdue,
    source: linked ? "linked" : "manual",
  };
}

export type IncomeRequirement = {
  monthlyOutflow: number;        // expenses + debt mins + draw (excluding goals)
  goalContributions: number;      // sum of monthly_needed across active non-done goals
  monthlyTotalNeed: number;       // outflow + goals
  grossNeeded: number;            // /  (1 - taxRate)
  currentGross: number;
  gap: number;                    // grossNeeded - currentGross (positive = shortfall)
};

export function computeIncomeRequirement(params: {
  bizExpenses: number;
  persExpenses: number;
  bizDebtMins: number;
  persDebtMins: number;
  draw: number;
  seTaxRate: number;
  incomeTaxRate: number;
  goalContributions: number;
  currentGross: number;
}): IncomeRequirement {
  const {
    bizExpenses,
    persExpenses,
    bizDebtMins,
    persDebtMins,
    draw,
    seTaxRate,
    incomeTaxRate,
    goalContributions,
    currentGross,
  } = params;
  const monthlyOutflow =
    bizExpenses + persExpenses + bizDebtMins + persDebtMins + draw;
  const monthlyTotalNeed = monthlyOutflow + goalContributions;
  const taxRate = (seTaxRate + incomeTaxRate) / 100;
  const grossNeeded =
    taxRate >= 1 ? monthlyTotalNeed : monthlyTotalNeed / (1 - taxRate);
  return {
    monthlyOutflow,
    goalContributions,
    monthlyTotalNeed,
    grossNeeded,
    currentGross,
    gap: grossNeeded - currentGross,
  };
}
