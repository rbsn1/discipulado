-- =============================================================
-- 012_report_stats_rpc.sql
-- Agrega as estatísticas de /relatorios dentro do Postgres em vez
-- de baixar todos os cases da congregação (todo status) pra contar
-- em JS. Espelha exatamente a lógica hoje em getReportStats()
-- (src/lib/repositories/reports.ts).
-- =============================================================

create or replace function get_report_stats()
returns table (
  total_cases            int,
  acolhimento            int,
  em_discipulado         int,
  pausado                int,
  concluido              int,
  sem_departamento       int,
  aguardando_confirmacao int,
  confirmados            int,
  batizados              int
)
language sql stable security definer
set search_path = public
as $$
  select
    count(*)::int,
    count(*) filter (
      where dc.stage = 'ACOLHIMENTO' and dc.status <> 'CONCLUIDO'
    )::int,
    count(*) filter (where dc.status = 'EM_DISCIPULADO')::int,
    count(*) filter (where dc.status = 'PAUSADO')::int,
    count(*) filter (where dc.status = 'CONCLUIDO')::int,
    count(*) filter (
      where dc.status = 'CONCLUIDO'
      and (pd.department_name is null or pd.department_name = '')
    )::int,
    count(*) filter (
      where dc.status = 'CONCLUIDO'
      and pd.department_name is not null and pd.department_name <> ''
      and pd.department_contacted_at is null
    )::int,
    count(*) filter (
      where dc.status = 'CONCLUIDO' and pd.department_contacted_at is not null
    )::int,
    count(*) filter (
      where dc.status = 'CONCLUIDO' and pd.baptism_status = 'BATIZADO'
    )::int
  from discipleship_cases dc
  left join post_discipleship pd on pd.case_id = dc.id
  where dc.congregation_id = auth_congregation_id();
$$;
