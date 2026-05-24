-- =============================================
-- Migration 007 — projects + project_id on expenses & transactions
-- Run in Supabase SQL editor.
-- =============================================

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  notes text,
  is_archived boolean default false,
  created_at timestamptz default now()
);

alter table projects enable row level security;

drop policy if exists "Users can only access their own projects" on projects;
create policy "Users can only access their own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on projects to anon, authenticated;

alter table expenses
  add column if not exists project_id uuid references projects on delete set null;

alter table expense_transactions
  add column if not exists project_id uuid references projects on delete set null;
