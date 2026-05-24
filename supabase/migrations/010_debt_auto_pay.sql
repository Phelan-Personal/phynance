-- =============================================
-- Migration 010 — auto-pay flag on debts
-- Run in Supabase SQL editor.
-- =============================================

alter table debts
  add column if not exists is_auto_pay boolean not null default false;
