-- =============================================================
-- 030_must_change_password.sql
-- Quando o admin cria um usuário ou redefine a senha de alguém, a senha
-- passa a ser gerada automaticamente pelo servidor (não digitada pelo
-- admin) e a pessoa é obrigada a trocá-la no primeiro login — a senha
-- temporária só circula uma vez (mostrada ao admin pra repassar por
-- WhatsApp/telefone), nunca fica sendo reaproveitada.
-- =============================================================

alter table profiles
  add column if not exists must_change_password boolean not null default false;
