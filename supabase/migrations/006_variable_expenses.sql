-- =============================================
-- Migration 006 — variable expense frequency + monthly history
-- Run in Supabase SQL editor.
-- =============================================

-- Allow 'variable' as a valid frequency
alter table expenses drop constraint if exists expenses_frequency_check;
alter table expenses
  add constraint expenses_frequency_check
  check (frequency in ('monthly', 'annual', 'quarterly', 'variable'));

create table if not exists expense_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  expense_id uuid references expenses on delete cascade not null,
  month date not null,                           -- YYYY-MM-01
  amount numeric not null default 0,
  notes text,
  created_at timestamptz default now(),
  unique(expense_id, month)
);

alter table expense_history enable row level security;

drop policy if exists "Users can only access their own expense_history" on expense_history;
create policy "Users can only access their own expense_history"
  on expense_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on expense_history to anon, authenticated;
