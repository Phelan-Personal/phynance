-- =============================================
-- Migration 015 — next_steps (user checklist)
-- Run in Supabase SQL editor.
-- =============================================

create table if not exists next_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  category text check (category in (
    'debt', 'cashflow', 'income', 'savings', 'tax', 'house',
    'rewards', 'other'
  )) not null default 'other',
  priority int not null default 5,
  is_completed boolean not null default false,
  completed_at timestamptz,
  due_date date,
  source_key text,                                -- links to a suggestion key for dedup
  created_at timestamptz default now()
);

alter table next_steps enable row level security;

drop policy if exists "Users can only access their own next_steps" on next_steps;
create policy "Users can only access their own next_steps"
  on next_steps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on next_steps to anon, authenticated;
