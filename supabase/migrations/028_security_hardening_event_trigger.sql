-- =============================================================
-- 028_security_hardening_event_trigger.sql
-- rls_auto_enable() é um event trigger handler gerenciado pela própria
-- Supabase (garante RLS ligado em toda tabela nova criada em public,
-- rede de segurança da plataforma, não foi escrita neste projeto) — não
-- estava no escopo original da 026/027 por engano. Mesma lógica: nada
-- legítimo chama via RPC direto, só o mecanismo de event trigger do
-- Postgres invoca.
-- =============================================================

revoke execute on function rls_auto_enable() from public;
