-- =============================================================
-- 033_report_stats_revoke_anon.sql
-- Funções novas no Postgres deste projeto nascem com EXECUTE concedido
-- direto pra anon/authenticated/service_role (privilégio padrão do schema
-- public na Supabase) — as duas funções criadas em 031 saíram expostas
-- pra anon de novo, desfazendo o espírito do endurecimento feito em
-- 026/027. Mesmo tratamento: só authenticated (usado pelo app) e
-- service_role continuam podendo chamar.
-- =============================================================

revoke execute on function get_report_stats(date, date) from anon;
revoke execute on function get_report_stats_by_assignee(date, date) from anon;
