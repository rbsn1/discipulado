-- =============================================================
-- 019_report_stats_department_id.sql
-- get_report_stats() (012_report_stats_rpc.sql) checava department_name
-- diretamente pra contar os buckets de integração. Com 018_departments_catalog.sql
-- o app parou de escrever nesse campo (usa department_id agora) — sem este
-- ajuste os contadores de /relatorios ficariam presos em "sem departamento"
-- pra sempre. Mesma lógica, só trocando a coluna verificada.
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
      and pd.department_id is null
    )::int,
    count(*) filter (
      where dc.status = 'CONCLUIDO'
      and pd.department_id is not null
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
