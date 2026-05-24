-- =============================================
-- Migration 008 — credit_limit on debts
-- Run in Supabase SQL editor.
-- Lets you track credit lines (cards, LOCs) and see availability.
-- =============================================

alter table debts
  add column if not exists credit_limit numeric;
