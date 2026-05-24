-- =============================================
-- Migration 003 — due dates + cash on hand
-- Run in Supabase SQL editor.
-- Adds the date dimension needed for a day-by-day cashflow timeline.
-- =============================================

alter table expenses
  add column if not exists due_day int check (due_day between 1 and 31);

alter table debts
  add column if not exists due_day int check (due_day between 1 and 31);

alter table income_streams
  add column if not exists pay_days text;  -- e.g. "1" or "1,15" or "15,30"

alter table financial_settings
  add column if not exists cash_on_hand numeric default 0;
