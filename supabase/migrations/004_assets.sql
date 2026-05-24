-- =============================================
-- Migration 004 — assets table (savings, crypto, stocks)
-- Run in the Supabase SQL editor.
-- =============================================

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text check (type in ('savings', 'crypto', 'stock', 'other')) not null default 'savings',
  symbol text,
  units numeric not null default 1,
  price_per_unit numeric not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table assets enable row level security;

drop policy if exists "Users can only access their own assets" on assets;
create policy "Users can only access their own assets"
  on assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on assets to anon, authenticated;

drop trigger if exists assets_updated_at on assets;
create trigger assets_updated_at before update on assets
  for each row execute procedure handle_updated_at();
