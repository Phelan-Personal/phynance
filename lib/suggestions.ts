import type {
  Asset,
  Debt,
  Expense,
  ExpenseHistory,
  FinancialSettings,
  Goal,
  IncomeHistory,
  IncomeStream,
  NextStepCategory,
  PendingPayment,
} from "@/types";
import { singleDebtPayoff } from "./calculations";
import { computeGoalProgress } from "./goals";
import { isStreamCurrentlyActive } from "./streams";

export type Suggestion = {
  key: string;
  title: string;
  description: string;
  category: NextStepCategory;
  priority: number; // 1 = highest, 5 = lowest
  link?: string;
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateSuggestions(opts: {
  debts: Debt[];
  expenses: Expense[];
  expenseHistory: ExpenseHistory[];
  streams: IncomeStream[];
  incomeHistory: IncomeHistory[];
  pendingPayments: PendingPayment[];
  goals: Goal[];
  assets: Asset[];
  settings: FinancialSettings;
  totalDebtMins: number;
  grossMonthly: number;
  effectiveExtra: number;
  cashflowLow: { day: number; balance: number } | null;
}): Suggestion[] {
  const {
    debts,
    expenses,
    streams,
    pendingPayments,
    goals,
    assets,
    settings,
    totalDebtMins,
    grossMonthly,
    effectiveExtra,
    cashflowLow,
  } = opts;

  const out: Suggestion[] = [];
  const today = todayIso();
  const activeDebts = debts.filter((d) => !d.is_paid_off);
  const totalDebt = activeDebts.reduce((a, d) => a + Number(d.balance), 0);

  // ────── Cashflow danger (highest priority) ──────
  if (cashflowLow && cashflowLow.balance < 0) {
    out.push({
      key: `cashflow-low-${cashflowLow.day}`,
      title: `Line up ${fmtMoney(Math.abs(cashflowLow.balance))} bridge cash before day ${cashflowLow.day}`,
      description: `Your balance bottoms out at ${fmtMoney(cashflowLow.balance)} this month. Move money, push out a payable, or pull in an A/R early.`,
      category: "cashflow",
      priority: 1,
      link: "/cashflow",
    });
  }

  // ────── Minimum doesn't cover interest (debt growing) ──────
  for (const d of activeDebts) {
    const p = singleDebtPayoff(
      Number(d.balance),
      Number(d.interest_rate),
      Number(d.min_payment)
    );
    if (p.warning === "min_too_low") {
      out.push({
        key: `min-too-low-${d.id}`,
        title: `${d.name}: minimum doesn't cover interest`,
        description: `At ${d.interest_rate}% APR on a ${fmtMoney(Number(d.balance))} balance, the minimum doesn't cover the monthly interest charge — balance grows every month. Refinance, do a balance transfer, or raise the payment.`,
        category: "debt",
        priority: 1,
        link: "/debts",
      });
    }
  }

  // ────── Over credit limit ──────
  for (const d of activeDebts) {
    if (d.credit_limit && Number(d.balance) > Number(d.credit_limit)) {
      const over = Number(d.balance) - Number(d.credit_limit);
      out.push({
        key: `over-limit-${d.id}`,
        title: `${d.name}: over limit by ${fmtMoney(over)}`,
        description: `You're past the credit line cap. Over-limit fees and rate hikes are likely. Get back under fast.`,
        category: "debt",
        priority: 1,
        link: "/debts",
      });
    }
  }

  // ────── High utilization (>80%) ──────
  for (const d of activeDebts) {
    if (d.credit_limit && Number(d.credit_limit) > 0) {
      const util = (Number(d.balance) / Number(d.credit_limit)) * 100;
      if (util > 80 && util <= 100) {
        out.push({
          key: `high-util-${d.id}`,
          title: `${d.name}: ${util.toFixed(0)}% utilization is hurting your credit score`,
          description: `FICO rewards under 30% utilization. Pay it down to ${fmtMoney(
            Number(d.credit_limit) * 0.3
          )} or below for a faster score bump.`,
          category: "debt",
          priority: 2,
          link: "/debts",
        });
      }
    }
  }

  // ────── High APR cards (>20%) ──────
  const highApr = activeDebts.find((d) => Number(d.interest_rate) > 20);
  if (highApr) {
    const interest = (Number(highApr.balance) * Number(highApr.interest_rate)) / 100;
    out.push({
      key: `high-apr-${highApr.id}`,
      title: `Attack ${highApr.name} first — ${highApr.interest_rate}% APR`,
      description: `Costing you ${fmtMoney(interest / 12)}/mo (${fmtMoney(interest)}/yr) in interest. Highest-rate debts get prioritized in avalanche strategy.`,
      category: "debt",
      priority: 2,
      link: "/strategy",
    });
  }

  // ────── Extra cash <= 0 with debt ──────
  if (totalDebt > 0 && effectiveExtra <= 0) {
    out.push({
      key: `no-extra-cash`,
      title: "Find $200/mo to put toward debt",
      description: `Your income after taxes, expenses, and minimums leaves nothing for extra payments. Try the bank scan to find subscriptions to cut, or check the cashflow timeline for the bottleneck.`,
      category: "cashflow",
      priority: 2,
      link: "/bank-scan",
    });
  }

  // ────── Emergency fund check ──────
  const hasEmergencyFund = goals.some(
    (g) => g.kind === "emergency_fund" && !g.is_archived
  );
  if (!hasEmergencyFund) {
    const bizMonthly = expenses
      .filter((e) => e.type === "business")
      .reduce((a, e) => a + Number(e.amount), 0);
    if (bizMonthly > 0) {
      out.push({
        key: `set-emergency-fund`,
        title: `Set a ${fmtMoney(bizMonthly * 3)}–${fmtMoney(bizMonthly * 6)} emergency fund goal`,
        description: `Aim for 3–6 months of business operating expenses liquid before aggressive debt paydown. Protects you from forced borrowing if revenue dips.`,
        category: "savings",
        priority: 3,
        link: "/goals",
      });
    }
  }

  // ────── Goals overdue ──────
  for (const g of goals.filter((x) => !x.is_archived)) {
    const p = computeGoalProgress(g, assets);
    if (p.isOverdue && !p.isDone) {
      out.push({
        key: `goal-overdue-${g.id}`,
        title: `Goal "${g.name}" is overdue`,
        description: `Target date passed with ${fmtMoney(p.amountRemaining)} still to save. Push out the date, lower the target, or boost the monthly contribution.`,
        category: "savings",
        priority: 3,
        link: "/goals",
      });
    }
  }

  // ────── A/R overdue 30+ days ──────
  for (const p of pendingPayments) {
    if (p.received_on || !p.expected_on) continue;
    const days = Math.floor(
      (new Date(today).getTime() - new Date(p.expected_on).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (days > 30) {
      out.push({
        key: `ar-overdue-${p.id}`,
        title: `Follow up on ${p.client_name} (${days} days overdue)`,
        description: `${fmtMoney(Number(p.amount))} expected on ${p.expected_on}. Send a reminder, propose a payment plan, or escalate.`,
        category: "income",
        priority: 2,
        link: "/income",
      });
    } else if (days > 7) {
      out.push({
        key: `ar-overdue-${p.id}`,
        title: `Nudge ${p.client_name} — invoice ${days} days late`,
        description: `${fmtMoney(Number(p.amount))} expected on ${p.expected_on}. A friendly reminder often does the trick.`,
        category: "income",
        priority: 3,
        link: "/income",
      });
    }
  }

  // ────── Rewards waiting to be redeemed ──────
  const totalRewards = debts.reduce(
    (a, d) => a + Number(d.rewards_balance || 0),
    0
  );
  if (totalRewards > 50) {
    out.push({
      key: `redeem-rewards`,
      title: `Redeem ${fmtMoney(totalRewards)} in card rewards`,
      description: `You've got rewards sitting on cards. Cash them out and put it toward a balance or savings.`,
      category: "rewards",
      priority: 4,
      link: "/debts",
    });
  }

  // ────── House goal: DTI > 43% ──────
  if (settings.house_target_price && grossMonthly > 0) {
    const dti = (totalDebtMins / grossMonthly) * 100;
    if (dti > 43) {
      out.push({
        key: `dti-too-high`,
        title: `DTI is ${dti.toFixed(0)}% — above lender threshold of 43%`,
        description: `Mortgage approval typically requires DTI under 43%. Pay down enough debt to get there before applying.`,
        category: "house",
        priority: 3,
        link: "/house-goal",
      });
    }
  }

  // ────── Income gap ──────
  if (settings.house_target_price || goals.some((g) => !g.is_archived)) {
    // soft hint — full math lives on /goals
    const hasGoals = goals.some(
      (g) => !g.is_archived && !computeGoalProgress(g, assets).isDone
    );
    if (hasGoals && grossMonthly > 0) {
      out.push({
        key: `check-income-gap`,
        title: "Check your income gap on /goals",
        description: `The Goals planner shows the total gross revenue you need to fund every goal plus your current obligations.`,
        category: "income",
        priority: 4,
        link: "/goals",
      });
    }
  }

  // ────── Auto-pay missing on cards with due_day ──────
  for (const d of activeDebts) {
    if (!d.is_auto_pay && d.due_day && Number(d.balance) > 0) {
      out.push({
        key: `enable-autopay-${d.id}`,
        title: `Enable auto-pay on ${d.name}`,
        description: `Avoids late fees and missed-payment APR hikes. You can always pay more on top manually.`,
        category: "debt",
        priority: 4,
        link: "/debts",
      });
      // Just one of these at a time to avoid flooding
      break;
    }
  }

  // ────── Ended stream with no final invoice logged ──────
  const endedStreams = streams.filter((s) => {
    if (!s.end_month) return false;
    return s.end_month < today;
  });
  for (const s of endedStreams) {
    const hasPending = pendingPayments.some(
      (p) => p.stream_id === s.id && !p.received_on
    );
    if (!hasPending) {
      out.push({
        key: `final-invoice-${s.id}`,
        title: `Log final invoice for ${s.name}?`,
        description: `Contract ended ${s.end_month} — if there's a final balance owed, log it as a pending payment so it stays on your radar.`,
        category: "income",
        priority: 4,
        link: "/income",
      });
    }
  }

  // ────── Unlogged income recent month ──────
  const activeStreamCount = streams.filter(isStreamCurrentlyActive).length;
  if (activeStreamCount > 0) {
    const now = new Date();
    const lastFullMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 7);
    const loggedLastMonth = opts.incomeHistory.some((h) =>
      h.month.startsWith(lastFullMonth)
    );
    if (!loggedLastMonth) {
      out.push({
        key: `log-income-${lastFullMonth}`,
        title: `Log last month's income`,
        description: `No income actuals logged for ${lastFullMonth}. Logging keeps your trend, average, and projection honest.`,
        category: "income",
        priority: 4,
        link: "/income",
      });
    }
  }

  // ────── Quarterly tax reminder ──────
  const todayDate = new Date();
  const month = todayDate.getMonth(); // 0-11
  const day = todayDate.getDate();
  const quarterly: { name: string; month: number; day: number }[] = [
    { name: "Q1", month: 3, day: 15 },
    { name: "Q2", month: 5, day: 15 },
    { name: "Q3", month: 8, day: 15 },
    { name: "Q4", month: 0, day: 15 }, // Jan 15 next year
  ];
  for (const q of quarterly) {
    const due = new Date(
      q.month === 0 ? todayDate.getFullYear() + 1 : todayDate.getFullYear(),
      q.month,
      q.day
    );
    const daysUntil = Math.ceil(
      (due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil >= 0 && daysUntil <= 30) {
      out.push({
        key: `quarterly-${q.name}-${due.getFullYear()}`,
        title: `${q.name} estimated taxes due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
        description: `Federal quarterly estimated tax payment due ${due.toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )}. Don't dip into operating cash to pay debt and skip this.`,
        category: "tax",
        priority: daysUntil <= 7 ? 1 : 3,
      });
      break;
    }
  }

  // ────── Final sort: priority asc, then alphabetical ──────
  out.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));

  return out;
}
