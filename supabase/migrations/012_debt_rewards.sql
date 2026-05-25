-- =============================================
-- Migration 012 — rewards on debts (credit cards)
-- Run in Supabase SQL editor.
-- =============================================

alter table debts
  add column if not exists rewards_description text,
  add column if not exists rewards_balance numeric not null default 0;
