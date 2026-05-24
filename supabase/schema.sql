-- =============================================
-- PHYNANCE — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- =============================================

-- =============================================
-- INCOME STREAMS
-- =============================================
create table if not exists income_streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text check (type in (
    'business',
    'freelance',
    'rental',
    'investment',
    'side_business',
    'other'
  )) not null default 'business',
  avg_monthly numeric default 0,
  is_primary boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists income_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  stream_id uuid references income_streams on delete cascade not null,
  month date not null,
  amount numeric not null default 0,
  notes text,
  unique(stream_id, month)
);

-- =============================================
-- FINANCIAL SETTINGS (one row per user)
-- =============================================
create table if not exists financial_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  personal_draw numeric default 0,
  se_tax_rate numeric default 15.3,
  income_tax_rate numeric default 22,
  payoff_strategy text check (payoff_strategy in ('avalanche', 'snowball')) default 'avalanche',
  extra_payment_override numeric,
  house_target_price numeric,
  house_down_payment_pct numeric default 20,
  house_current_savings numeric default 0,
  house_monthly_save numeric default 0,
  house_mortgage_rate numeric default 7.0,
  house_target_date date,
  updated_at timestamptz default now()
);

-- =============================================
-- DEBTS
-- =============================================
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text check (type in ('personal', 'business')) not null,
  balance numeric not null default 0,
  interest_rate numeric not null default 0,
  min_payment numeric not null default 0,
  original_balance numeric,
  notes text,
  is_paid_off boolean default false,
  paid_off_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- EXPENSES
-- =============================================
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text check (type in ('personal', 'business')) not null,
  amount numeric not null default 0,
  category text,
  is_recurring boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- BANK SCAN SESSIONS (optional persistence)
-- =============================================
create table if not exists bank_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  scanned_at timestamptz default now(),
  filename text,
  total_transactions int,
  total_outflow numeric,
  summary jsonb
);

-- =============================================
-- PRIVILEGES — required when project defaults don't grant
-- public schema access to anon/authenticated automatically.
-- =============================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table income_streams enable row level security;
alter table income_history enable row level security;
alter table financial_settings enable row level security;
alter table debts enable row level security;
alter table expenses enable row level security;
alter table bank_scans enable row level security;

drop policy if exists "Users can only access their own income_streams" on income_streams;
create policy "Users can only access their own income_streams"
  on income_streams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can only access their own income_history" on income_history;
create policy "Users can only access their own income_history"
  on income_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can only access their own financial_settings" on financial_settings;
create policy "Users can only access their own financial_settings"
  on financial_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can only access their own debts" on debts;
create policy "Users can only access their own debts"
  on debts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can only access their own expenses" on expenses;
create policy "Users can only access their own expenses"
  on expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can only access their own bank_scans" on bank_scans;
create policy "Users can only access their own bank_scans"
  on bank_scans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists debts_updated_at on debts;
create trigger debts_updated_at before update on debts
  for each row execute procedure handle_updated_at();

drop trigger if exists settings_updated_at on financial_settings;
create trigger settings_updated_at before update on financial_settings
  for each row execute procedure handle_updated_at();
