-- =============================================
-- Migration 018 — debt_payments (payment history)
-- Run in Supabase SQL editor.
-- =============================================

create table if not exists debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  debt_id uuid references debts on delete cascade not null,
  amount numeric not null,
  payment_date date not null default current_date,
  balance_after numeric,                          -- snapshot of remaining balance after this payment
  notes text,
  created_at timestamptz default now()
);

alter table debt_payments enable row level security;

drop policy if exists "Users can only access their own debt_payments"
  on debt_payments;
create policy "Users can only access their own debt_payments"
  on debt_payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on debt_payments to anon, authenticated;
