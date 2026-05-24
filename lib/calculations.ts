// ─── Types ───────────────────────────────────────────────

export type CalcDebt = {
  id: string;
  name: string;
  type: "personal" | "business";
  balance: number;
  interest_rate: number; // APR %
  min_payment: number;
};

export type BurndownResult = {
  history: number[];
  months: number;
  totalInterest: number;
};

export type PayoffPlanItem = CalcDebt & {
  monthPaidOff: number | null;
  totalInterestPaid: number;
  monthlyFreeAfter: number;
};

export type Strategy = "avalanche" | "snowball";

// ─── Burndown Algorithm ──────────────────────────────────

export function runBurndown(
  debts: CalcDebt[],
  extraPayment: number,
  strategy: Strategy,
  minOnly = false
): BurndownResult {
  if (!debts.length) return { history: [0], months: 0, totalInterest: 0 };

  let rem = debts.map((d) => ({ ...d, bal: d.balance }));
  const history = [rem.reduce((a, d) => a + d.bal, 0)];
  let totalInterest = 0;
  const usedExtra = minOnly ? 0 : extraPayment;

  for (let m = 0; m < 360; m++) {
    if (rem.every((d) => d.bal <= 0.01)) break;

    // Interest
    rem = rem.map((d) => {
      if (d.bal <= 0.01) return { ...d, bal: 0 };
      const interest = d.bal * (d.interest_rate / 100 / 12);
      totalInterest += interest;
      return { ...d, bal: d.bal + interest };
    });

    // Minimums
    rem = rem.map((d) => {
      if (d.bal <= 0.01) return { ...d, bal: 0 };
      const payment = Math.min(d.bal, d.min_payment);
      return { ...d, bal: Math.max(0, d.bal - payment) };
    });

    // Extra to priority debt
    let extraLeft = usedExtra;
    const active = rem.filter((d) => d.bal > 0.01);
    const sorted =
      strategy === "avalanche"
        ? [...active].sort((a, b) => b.interest_rate - a.interest_rate)
        : [...active].sort((a, b) => a.bal - b.bal);

    for (const p of sorted) {
      if (extraLeft <= 0.01) break;
      const idx = rem.findIndex((d) => d.id === p.id);
      const applied = Math.min(extraLeft, rem[idx].bal);
      rem[idx] = { ...rem[idx], bal: rem[idx].bal - applied };
      extraLeft -= applied;
    }

    history.push(rem.reduce((a, d) => a + Math.max(0, d.bal), 0));
  }

  return { history, months: history.length - 1, totalInterest };
}

// ─── Payoff Plan ──────────────────────────────────────────

export function getPayoffPlan(
  debts: CalcDebt[],
  extraPayment: number,
  strategy: Strategy
): PayoffPlanItem[] {
  let rem = debts.map((d) => ({
    ...d,
    bal: d.balance,
    monthPaidOff: null as number | null,
    totalInterestPaid: 0,
  }));

  for (let m = 0; m < 360; m++) {
    if (rem.every((d) => d.bal <= 0.01)) break;

    rem = rem.map((d) => {
      if (d.bal <= 0.01) return d;
      const interest = d.bal * (d.interest_rate / 100 / 12);
      return {
        ...d,
        bal: d.bal + interest,
        totalInterestPaid: d.totalInterestPaid + interest,
      };
    });

    rem = rem.map((d) => {
      if (d.bal <= 0.01) return d;
      const pay = Math.min(d.bal, d.min_payment);
      const newBal = Math.max(0, d.bal - pay);
      return {
        ...d,
        bal: newBal,
        monthPaidOff:
          newBal <= 0.01 && d.monthPaidOff === null ? m + 1 : d.monthPaidOff,
      };
    });

    let extraLeft = extraPayment;
    const active = rem.filter((d) => d.bal > 0.01);
    const sorted =
      strategy === "avalanche"
        ? [...active].sort((a, b) => b.interest_rate - a.interest_rate)
        : [...active].sort((a, b) => a.bal - b.bal);

    for (const p of sorted) {
      if (extraLeft <= 0.01) break;
      const idx = rem.findIndex((d) => d.id === p.id);
      const applied = Math.min(extraLeft, rem[idx].bal);
      const newBal = rem[idx].bal - applied;
      rem[idx] = {
        ...rem[idx],
        bal: newBal,
        monthPaidOff:
          newBal <= 0.01 && rem[idx].monthPaidOff === null
            ? m + 1
            : rem[idx].monthPaidOff,
      };
      extraLeft -= applied;
    }
  }

  const sorted = rem.sort(
    (a, b) => (a.monthPaidOff ?? 999) - (b.monthPaidOff ?? 999)
  );

  return sorted.map((d) => ({
    ...d,
    monthlyFreeAfter: d.min_payment,
  }));
}

// ─── Income Needed for Goal ───────────────────────────────

export function incomeNeededForGoal(params: {
  debts: CalcDebt[];
  goalMonths: number;
  strategy: Strategy;
  bizExpenses: number;
  persExpenses: number;
  bizDebtMins: number;
  persDebtMins: number;
  draw: number;
  seTaxRate: number;
  incomeTaxRate: number;
}): { grossNeeded: number; extraNeeded: number } {
  const {
    debts,
    goalMonths,
    strategy,
    bizExpenses,
    persExpenses,
    bizDebtMins,
    persDebtMins,
    draw,
    seTaxRate,
    incomeTaxRate,
  } = params;
  const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
  if (!totalDebt) return { grossNeeded: 0, extraNeeded: 0 };

  let lo = 0;
  let hi = totalDebt * 3;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const { months } = runBurndown(debts, mid, strategy);
    if (months <= goalMonths) hi = mid;
    else lo = mid;
  }

  const requiredExtra = (lo + hi) / 2;
  const taxRate = (seTaxRate + incomeTaxRate) / 100;
  const baseCosts =
    bizExpenses + persExpenses + bizDebtMins + persDebtMins + draw + requiredExtra;
  const grossNeeded = taxRate >= 1 ? baseCosts : baseCosts / (1 - taxRate);
  return { grossNeeded, extraNeeded: requiredExtra };
}

// ─── Auto Extra Calculation ───────────────────────────────

export function calcAutoExtra(params: {
  grossMonthly: number;
  draw: number;
  seTaxRate: number;
  incomeTaxRate: number;
  bizExpenses: number;
  persExpenses: number;
  bizDebtMins: number;
  persDebtMins: number;
}): number {
  const {
    grossMonthly,
    draw,
    seTaxRate,
    incomeTaxRate,
    bizExpenses,
    persExpenses,
    bizDebtMins,
    persDebtMins,
  } = params;
  const seTax = grossMonthly * (seTaxRate / 100);
  const incTax = grossMonthly * (incomeTaxRate / 100);
  const bizAvailable =
    grossMonthly - seTax - incTax - bizExpenses - bizDebtMins - draw;
  const persAvailable = draw - persExpenses - persDebtMins;
  return Math.max(0, bizAvailable + persAvailable);
}

// ─── DTI Calculation ─────────────────────────────────────

export function calcDTI(
  monthlyDebtPayments: number,
  grossMonthlyIncome: number
): number {
  if (!grossMonthlyIncome) return 0;
  return (monthlyDebtPayments / grossMonthlyIncome) * 100;
}

// ─── Mortgage Payment Estimate ────────────────────────────

export function calcMonthlyMortgage(
  loanAmount: number,
  annualRatePct: number,
  termYears = 30
): number {
  if (!loanAmount || !annualRatePct) return 0;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  return (loanAmount * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

// ─── Single-Debt Payoff (just balance, APR, min payment) ──

export type SingleDebtPayoff = {
  months: number | null;          // null = never (min doesn't cover interest)
  totalInterest: number;
  warning: "no_payment" | "min_too_low" | null;
};

export function singleDebtPayoff(
  balance: number,
  aprPct: number,
  monthlyPayment: number
): SingleDebtPayoff {
  if (balance <= 0) {
    return { months: 0, totalInterest: 0, warning: null };
  }
  if (monthlyPayment <= 0) {
    return { months: null, totalInterest: 0, warning: "no_payment" };
  }
  if (aprPct === 0) {
    const m = Math.ceil(balance / monthlyPayment);
    return { months: m, totalInterest: 0, warning: null };
  }
  const r = aprPct / 100 / 12;
  const interestOnly = balance * r;
  if (monthlyPayment <= interestOnly + 0.01) {
    return { months: null, totalInterest: 0, warning: "min_too_low" };
  }
  // n = log(P / (P - r*B)) / log(1+r)
  const n =
    Math.log(monthlyPayment / (monthlyPayment - r * balance)) /
    Math.log(1 + r);
  const months = Math.ceil(n);
  const totalInterest = Math.max(0, months * monthlyPayment - balance);
  return { months, totalInterest, warning: null };
}

// ─── Down Payment Savings Runway ─────────────────────────

export function calcDownPaymentMonths(
  targetPrice: number,
  downPct: number,
  currentSavings: number,
  monthlySave: number
): number {
  const needed = targetPrice * (downPct / 100);
  const remaining = Math.max(0, needed - currentSavings);
  if (!monthlySave) return Infinity;
  return Math.ceil(remaining / monthlySave);
}
