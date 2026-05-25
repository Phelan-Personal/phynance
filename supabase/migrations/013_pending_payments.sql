-- =============================================
-- Migration 013 — pending_payments (accounts receivable)
-- Run in Supabase SQL editor.
-- =============================================

create table if not exists pending_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  stream_id uuid references income_streams on delete set null,
  client_name text not null,
  description text,
  amount numeric not null,
  issued_on date,
  expected_on date,
  received_on date,
  notes text,
  created_at timestamptz default now()
);

alter table pending_payments enable row level security;

drop policy if exists "Users can only access their own pending_payments"
  on pending_payments;
create policy "Users can only access their own pending_payments"
  on pending_payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on pending_payments to anon, authenticated;
