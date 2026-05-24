-- =============================================
-- Migration 002 — income stream active range
-- Run in the Supabase SQL editor.
-- Adds start_month / end_month so a stream's average is computed
-- only over the months it was actually active.
-- =============================================

alter table income_streams
  add column if not exists start_month date,
  add column if not exists end_month date;
