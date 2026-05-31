-- =============================================
-- Migration 017 — link_url on assets
-- Run in Supabase SQL editor.
-- =============================================

alter table assets
  add column if not exists link_url text;
