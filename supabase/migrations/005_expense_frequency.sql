-- =============================================
-- Migration 005 — expense frequency (annual, quarterly)
-- Run in Supabase SQL editor.
-- =============================================

alter table expenses
  add column if not exists frequency text
    check (frequency in ('monthly', 'annual', 'quarterly'))
    not null default 'monthly';

alter table expenses
  add column if not exists due_month int check (due_month between 1 and 12);
