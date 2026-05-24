-- =============================================
-- Migration 009 — payment_url on debts
-- Run in Supabase SQL editor.
-- =============================================

alter table debts
  add column if not exists payment_url text;
