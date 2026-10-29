-- =============================================================
-- 036_shift_preference_on_acolhimento.sql
-- Desacopla a Festa de Boas Vindas do fluxo de acolhimento:
--
-- 1. Adiciona preferred_shift_id em discipleship_cases (FK → class_shifts)
-- 2. create_discipleship_case passa a aceitar p_preferred_shift_id
-- 3. Remove os triggers de auto-advance/revert ligados às FBVs
--    (trg_auto_advance_case_after_fbv, trg_auto_advance_cases_on_event_realizado,
--     trg_revert_case_after_fbv_removed) — o case não depende mais de FBV
-- 4. get_dashboard_stats: sem_matricula passa a incluir EM_ACOLHIMENTO
--    (agora que a transição de status depende do acolhedor, não da FBV)
--
-- A confraternização continua existindo como evento, mas sem ser portão
-- no fluxo. A preferência de turno é coletada pelo acolhedor no primeiro
-- contato e armazenada em discipleship_cases.preferred_shift_id.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Nova coluna: preferred_shift_id em discipleship_cases
-- ---------------------------------------------------------------
alter table discipleship_cases
  add column if not exists preferred_shift_id uuid
  references class_shifts(id) on delete set null;

create index if not exists idx_cases_preferred_shift
  on discipleship_cases(preferred_shift_id)
  where preferred_shift_id is not null;

-- ---------------------------------------------------------------
-- 2. create_discipleship_case: aceita preferred_shift_id
--    Assinatura nova = função nova no Postgres (create or replace não
--    substitui). Remove a versão de 6 args pra não ficar overload
--    ambíguo (mesmo problema da 032).
-- ---------------------------------------------------------------
drop function if exists create_discipleship_case(uuid, uuid, uuid, date, text, uuid);

create or replace function create_discipleship_case(
  p_disciple_id       uuid,
  p_congregation_id   uuid,
  p_assigned_to       uuid,
  p_welcomed_on       date,
  p_notes             text,
  p_created_by        uuid,
  p_preferred_shift_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_case_id         uuid;
  v_module_count    int;
  v_active_case     uuid;
begin
  -- Verificar se já existe case ativo
  select id into v_active_case
  from discipleship_cases
  where disciple_id = p_disciple_id
    and status in ('EM_ACOLHIMENTO', 'PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')
  limit 1;

  if v_active_case is not null then
    raise exception 'CASE_ALREADY_ACTIVE: discipulando já possui um case ativo';
  end if;

  -- Verificar se há módulos ativos na congregação
  select count(*) into v_module_count
  from module_templates
  where congregation_id = p_congregation_id and is_active = true;

  if v_module_count = 0 then
    raise exception 'NO_ACTIVE_MODULES: a congregação não possui módulos ativos. Cadastre os módulos antes de iniciar o acolhimento';
  end if;

  -- Criar o case
  insert into discipleship_cases (
    disciple_id, congregation_id, status, stage,
    assigned_to, welcomed_on, notes, created_by, preferred_shift_id
  ) values (
    p_disciple_id, p_congregation_id, 'EM_ACOLHIMENTO', 'ACOLHIMENTO',
    p_assigned_to, p_welcomed_on, p_notes, p_created_by, p_preferred_shift_id
  ) returning id into v_case_id;

  -- Criar progresso para cada módulo ativo
  insert into case_module_progress (case_id, module_template_id, status)
  select v_case_id, id, 'NAO_INICIADO'
  from module_templates
  where congregation_id = p_congregation_id and is_active = true;

  -- Registrar evento de acolhimento
  insert into case_events (case_id, type, description, created_by)
  values (v_case_id, 'ACOLHIMENTO', 'Acolhimento iniciado', p_created_by);

  return v_case_id;
end;
$$;

-- Função nova nasce com EXECUTE pra PUBLIC e com grant direto pra anon
-- (default privileges do Supabase) — repete o
-- fechamento da 027 pra esta assinatura.
revoke execute on function
  create_discipleship_case(uuid, uuid, uuid, date, text, uuid, uuid)
from public, anon;
grant execute on function
  create_discipleship_case(uuid, uuid, uuid, date, text, uuid, uuid)
to authenticated, service_role;

-- ---------------------------------------------------------------
-- 3. Remover os triggers de auto-advance/revert das FBVs
-- ---------------------------------------------------------------
drop trigger if exists trg_auto_advance_case_after_fbv on event_confirmations;
drop trigger if exists trg_auto_advance_cases_on_event_realizado on events;
drop trigger if exists trg_revert_case_after_fbv_removed on event_confirmations;

-- Funções orfanadas — seguras de remover, nada mais as chama
drop function if exists advance_case_after_fbv_confirmation(uuid, uuid);
drop function if exists revert_case_after_fbv_confirmation_removed(uuid, uuid);
drop function if exists trg_fn_confirmation_attended();
drop function if exists trg_fn_event_realizado();
drop function if exists trg_fn_confirmation_removed_or_unattended();

-- ---------------------------------------------------------------
-- 4. get_dashboard_stats: sem_matricula inclui EM_ACOLHIMENTO
--    (antes só contava PENDENTE_MATRICULA, mas agora o acolhimento
--     não tem a FBV como portão — EM_ACOLHIMENTO também está pronto
--     pra ser matriculado assim que o acolhedor fizer o primeiro contato)
-- ---------------------------------------------------------------
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
      where status in ('EM_ACOLHIMENTO', 'PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')
      and assigned_to is null
    )::int,
    count(*) filter (where status in ('EM_ACOLHIMENTO', 'PENDENTE_MATRICULA'))::int,
    count(*) filter (where status = 'EM_DISCIPULADO' and attendance_rate < 75)::int,
    count(*) filter (
      where status in ('EM_ACOLHIMENTO', 'PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')
      and (last_contact_at is null or last_contact_at < now() - interval '30 days')
    )::int
  from discipleship_cases
  where congregation_id = auth_congregation_id();
$$;
