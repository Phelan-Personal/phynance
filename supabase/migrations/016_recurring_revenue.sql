-- =============================================
-- Migration 016 — recurring_revenue (per-client subscriptions)
-- Run in Supabase SQL editor.
-- =============================================

create table if not exists recurring_revenue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  stream_id uuid references income_streams on delete set null,
  name text not null,
  client_name text,
  amount numeric not null,
  category text,                                  -- "hosting", "maintenance", "retainer", "license"
  due_day int check (due_day between 1 and 31),
  start_month date,
  end_month date,                                 -- null = ongoing
  notes text,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table recurring_revenue enable row level security;

drop policy if exists "Users can only access their own recurring_revenue"
  on recurring_revenue;
create policy "Users can only access their own recurring_revenue"
  on recurring_revenue for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on recurring_revenue to anon, authenticated;

drop trigger if exists recurring_revenue_updated_at on recurring_revenue;
create trigger recurring_revenue_updated_at before update on recurring_revenue
  for each row execute procedure handle_updated_at();
