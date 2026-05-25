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
  start_month: string | null; // YYYY-MM-01 or null
  end_month: string | null;
  pay_days: string | null; // comma-separated 1..31, e.g. "1,15"
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
  cash_on_hand: number;
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
  credit_limit: number | null;
  due_day: number | null;
  payment_url: string | null;
  is_auto_pay: boolean;
  rewards_description: string | null;
  rewards_balance: number;
  notes: string | null;
  is_paid_off: boolean;
  paid_off_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseType = "personal" | "business";

export type ExpenseFrequency = "monthly" | "annual" | "quarterly" | "variable";

export type ExpenseHistory = {
  id: string;
  user_id: string;
  expense_id: string;
  month: string; // YYYY-MM-01
  amount: number;
  notes: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  name: string;
  type: ExpenseType;
  amount: number;
  category: string | null;
  due_day: number | null;
  frequency: ExpenseFrequency;
  due_month: number | null; // 1-12, only for annual/quarterly
  project_id: string | null;
  is_recurring: boolean;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
};

export type PendingPayment = {
  id: string;
  user_id: string;
  stream_id: string | null;
  client_name: string;
  description: string | null;
  amount: number;
  issued_on: string | null;
  expected_on: string | null;
  received_on: string | null; // null = pending
  notes: string | null;
  created_at: string;
};

export type ExpenseTransactionSource = "manual" | "bank_scan";

export type ExpenseTransaction = {
  id: string;
  user_id: string;
  name: string;
  type: ExpenseType;
  amount: number;
  category: string | null;
  occurred_on: string; // YYYY-MM-DD
  source: ExpenseTransactionSource;
  project_id: string | null;
  created_at: string;
};

export type GoalKind =
  | "emergency_fund"
  | "retirement"
  | "savings"
  | "investment"
  | "debt_payoff"
  | "custom";

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  kind: GoalKind;
  target_amount: number;
  current_amount: number;
  linked_asset_id: string | null;
  target_date: string | null;
  monthly_contribution_override: number | null;
  priority: number;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type AssetType =
  | "savings"
  | "bank_account"
  | "crypto"
  | "stock"
  | "other";

export type Asset = {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  symbol: string | null;
  units: number;
  price_per_unit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function assetValue(a: { units: number; price_per_unit: number }): number {
  return Number(a.units) * Number(a.price_per_unit);
}

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
