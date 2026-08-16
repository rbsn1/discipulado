-- =============================================================
-- 032_drop_old_report_stats_overload.sql
-- 031 criou get_report_stats(p_start, p_end) — como Postgres trata
-- assinatura diferente como função nova, não substitui, a versão antiga
-- sem parâmetros (019_report_stats_department_id.sql) ficou órfã (o app
-- só chama a versão com os dois parâmetros agora). Mesmo tipo de limpeza
-- já feita antes nesta base (auto_advance_case_after_fbv_confirmation).
-- =============================================================

drop function if exists get_report_stats();
