-- =============================================================
-- 034_report_stats_revoke_public.sql
-- 033 revogou a concessão DIRETA de anon, mas restava concessão via
-- PUBLIC (pseudo-papel herdado por todo mundo, `=X/postgres` no ACL) —
-- mesma pegadinha da 026/027. Sem isso, anon ainda conseguia executar.
-- =============================================================

revoke execute on function get_report_stats(date, date) from public;
revoke execute on function get_report_stats_by_assignee(date, date) from public;
