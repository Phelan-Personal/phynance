-- =============================================
-- Migration 001 — expense_transactions
-- Run this in the Supabase SQL editor.
-- Adds the dated transactions table that bank scan imports into.
-- =============================================

create table if not exists expense_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text check (type in ('personal', 'business')) not null,
  amount numeric not null default 0,
  category text,
  occurred_on date not null,
  source text not null default 'manual',
  created_at timestamptz default now()
);

alter table expense_transactions enable row level security;

drop policy if exists "Users can only access their own expense_transactions"
  on expense_transactions;
create policy "Users can only access their own expense_transactions"
  on expense_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Make sure anon/authenticated have the table-level grants.
-- (No-op if already granted via default privileges in the original schema.)
grant all on expense_transactions to anon, authenticated;
