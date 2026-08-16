-- =============================================================
-- 031_report_improvements.sql
-- Melhorias de /relatorios levantadas via skill discipulado-improvements:
--
-- 1. get_report_stats() ganha período opcional (p_start/p_end), filtrando
--    por dc.created_at — semântica de "coorte": quantos casos começaram
--    nesse intervalo, e em que status estão hoje. Sem argumentos continua
--    igual a antes (todo o histórico), então chamadas existentes não quebram.
-- 2. get_report_stats_by_assignee() é nova — accountability por acolhedor
--    (quantos casos, quantos concluídos, taxa de conclusão), coisa que
--    antes não existia agregada em lugar nenhum.
-- =============================================================

create or replace function get_report_stats(
  p_start date default null,
  p_end   date default null
)
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
  where dc.congregation_id = auth_congregation_id()
    and (p_start is null or dc.created_at >= p_start)
    and (p_end   is null or dc.created_at < (p_end + interval '1 day'));
$$;

create or replace function get_report_stats_by_assignee(
  p_start date default null,
  p_end   date default null
)
returns table (
  assigned_to    uuid,
  assignee_name  text,
  total          int,
  concluido      int,
  taxa_conclusao numeric
)
language sql stable security definer
set search_path = public
as $$
  select
    dc.assigned_to,
    coalesce(p.name, 'Sem responsável') as assignee_name,
    count(*)::int as total,
    count(*) filter (where dc.status = 'CONCLUIDO')::int as concluido,
    case when count(*) > 0
      then round((count(*) filter (where dc.status = 'CONCLUIDO')::numeric / count(*)) * 100, 1)
      else 0
    end as taxa_conclusao
  from discipleship_cases dc
  left join profiles p on p.id = dc.assigned_to
  where dc.congregation_id = auth_congregation_id()
    and (p_start is null or dc.created_at >= p_start)
    and (p_end   is null or dc.created_at < (p_end + interval '1 day'))
  group by dc.assigned_to, p.name
  order by total desc;
$$;
