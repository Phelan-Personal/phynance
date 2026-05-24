export type IncomeStreamType =
  | "business"
  | "freelance"
  | "rental"
  | "investment"
  | "side_business"
  | "other";

export type IncomeStream = {
  id: string;
  user_id: string;
  name: string;
  type: IncomeStreamType;
  avg_monthly: number;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
};

export type IncomeHistory = {
  id: string;
  user_id: string;
  stream_id: string;
  month: string; // YYYY-MM-01
  amount: number;
  notes: string | null;
};

export type PayoffStrategy = "avalanche" | "snowball";

export type FinancialSettings = {
  id: string;
  user_id: string;
  personal_draw: number;
  se_tax_rate: number;
  income_tax_rate: number;
  payoff_strategy: PayoffStrategy;
  extra_payment_override: number | null;
  house_target_price: number | null;
  house_down_payment_pct: number;
  house_current_savings: number;
  house_monthly_save: number;
  house_mortgage_rate: number;
  house_target_date: string | null;
  updated_at: string;
};

export type DebtType = "personal" | "business";

export type Debt = {
  id: string;
  user_id: string;
  name: string;
  type: DebtType;
  balance: number;
  interest_rate: number;
  min_payment: number;
  original_balance: number | null;
  notes: string | null;
  is_paid_off: boolean;
  paid_off_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseType = "personal" | "business";

export type Expense = {
  id: string;
  user_id: string;
  name: string;
  type: ExpenseType;
  amount: number;
  category: string | null;
  is_recurring: boolean;
  created_at: string;
};

export type BankScanCategorySummary = Record<
  string,
  { total: number; count: number }
>;

export type BankScan = {
  id: string;
  user_id: string;
  scanned_at: string;
  filename: string | null;
  total_transactions: number | null;
  total_outflow: number | null;
  summary: BankScanCategorySummary | null;
};
