-- =============================================
-- Migration 011 — add bank_account to asset types
-- Run in Supabase SQL editor.
-- =============================================

alter table assets drop constraint if exists assets_type_check;
alter table assets
  add constraint assets_type_check
  check (type in ('savings', 'bank_account', 'crypto', 'stock', 'other'));
