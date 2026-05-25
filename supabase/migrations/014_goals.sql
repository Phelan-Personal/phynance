-- =============================================
-- Migration 014 — goals (multi-goal income planner)
-- Run in Supabase SQL editor.
-- =============================================

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  kind text check (kind in (
    'emergency_fund',
    'retirement',
    'savings',
    'investment',
    'debt_payoff',
    'custom'
  )) not null default 'custom',
  target_amount numeric not null,
  current_amount numeric not null default 0,
  linked_asset_id uuid references assets on delete set null,
  target_date date,
  monthly_contribution_override numeric,
  priority int default 5,
  notes text,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table goals enable row level security;

drop policy if exists "Users can only access their own goals" on goals;
create policy "Users can only access their own goals"
  on goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on goals to anon, authenticated;

drop trigger if exists goals_updated_at on goals;
create trigger goals_updated_at before update on goals
  for each row execute procedure handle_updated_at();
