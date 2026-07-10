-- =============================================================
-- 011_dashboard_stats_rpc.sql
-- Agrega as estatísticas do painel dentro do Postgres em vez de
-- baixar todos os cases da congregação pra contar em JS.
-- Espelha exatamente a lógica hoje em getDashboardStats()
-- (src/lib/repositories/cases.ts).
-- =============================================================

create or replace function get_dashboard_stats()
returns table (
  acolhimento         int,
  pendente_matricula  int,
  em_discipulado      int,
  pausado             int,
  concluido           int,
  sem_responsavel     int,
  sem_matricula       int,
  baixa_frequencia    int,
  sem_contato_recente int
)
language sql stable security definer
set search_path = public
as $$
  select
    count(*) filter (where stage = 'ACOLHIMENTO')::int,
    count(*) filter (where status = 'PENDENTE_MATRICULA')::int,
    count(*) filter (where status = 'EM_DISCIPULADO')::int,
    count(*) filter (where status = 'PAUSADO')::int,
    count(*) filter (where status = 'CONCLUIDO')::int,
    count(*) filter (
      where status in ('PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')
      and assigned_to is null
    )::int,
    count(*) filter (where status = 'PENDENTE_MATRICULA')::int,
    count(*) filter (where status = 'EM_DISCIPULADO' and attendance_rate < 75)::int,
    count(*) filter (
      where status in ('PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')
      and (last_contact_at is null or last_contact_at < now() - interval '30 days')
    )::int
  from discipleship_cases
  where congregation_id = auth_congregation_id();
$$;
