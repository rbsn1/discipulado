-- =============================================================
-- 005_integration_contact.sql
-- Adiciona rastreamento de confirmação de contato pelo departamento
-- =============================================================

ALTER TABLE post_discipleship
  ADD COLUMN IF NOT EXISTS department_contacted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS department_contacted_by  uuid references profiles(id);
