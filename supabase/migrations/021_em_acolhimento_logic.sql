-- =============================================================
-- 021_em_acolhimento_logic.sql
-- Regra de negócio: um case agora nasce como EM_ACOLHIMENTO (não mais
-- direto em PENDENTE_MATRICULA). Só vira PENDENTE_MATRICULA — liberando
-- a matrícula em turma — quando a presença é confirmada numa Festa de
-- Boas Vindas (event_confirmations.attended = true). Reaproveita o
-- padrão já usado em 006_auto_module_progress.sql (trigger que avança
-- estado automaticamente, nunca regride sozinho).
--
-- Cases já existentes NÃO são migrados retroativamente — quem já está
-- em PENDENTE_MATRICULA continua lá; a mudança vale só pra cases
-- criados a partir de agora.
-- =============================================================

-- ---------------------------------------------------------------
-- create_discipleship_case: nasce em EM_ACOLHIMENTO, e o check de
-- "já tem case ativo" passa a considerar EM_ACOLHIMENTO também.
-- ---------------------------------------------------------------
create or replace function create_discipleship_case(
  p_disciple_id    uuid,
  p_congregation_id uuid,
  p_assigned_to    uuid,
  p_welcomed_on    date,
  p_notes          text,
  p_created_by     uuid
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
    assigned_to, welcomed_on, notes, created_by
  ) values (
    p_disciple_id, p_congregation_id, 'EM_ACOLHIMENTO', 'ACOLHIMENTO',
    p_assigned_to, p_welcomed_on, p_notes, p_created_by
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

-- ---------------------------------------------------------------
-- Trigger: confirmar presença numa Festa de Boas Vindas libera a
-- matrícula (EM_ACOLHIMENTO → PENDENTE_MATRICULA). Nunca regride —
-- desmarcar presença depois não volta o case pra EM_ACOLHIMENTO.
-- ---------------------------------------------------------------
create or replace function auto_advance_case_after_fbv_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'DELETE') then
    return old;
  end if;

  if new.attended is not true then
    return new;
  end if;

  update discipleship_cases
  set
    status     = 'PENDENTE_MATRICULA',
    updated_at = now()
  where id = new.case_id
    and status = 'EM_ACOLHIMENTO';

  if found then
    insert into case_events (case_id, type, description, created_by)
    values (
      new.case_id,
      'ACOLHIMENTO',
      'Presença confirmada na Festa de Boas Vindas — matrícula liberada',
      new.created_by
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_advance_case_after_fbv on event_confirmations;

create trigger trg_auto_advance_case_after_fbv
  after insert or update of attended
  on event_confirmations
  for each row
  execute function auto_advance_case_after_fbv_confirmation();

-- ---------------------------------------------------------------
-- Índice de "um case ativo por discipulando" precisa considerar
-- EM_ACOLHIMENTO como ativo também.
-- ---------------------------------------------------------------
drop index if exists idx_cases_one_active_per_disciple;

create unique index idx_cases_one_active_per_disciple
  on discipleship_cases (disciple_id)
  where status in ('EM_ACOLHIMENTO', 'PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO');

-- ---------------------------------------------------------------
-- get_dashboard_stats: "sem responsável" e "sem contato recente"
-- devem enxergar EM_ACOLHIMENTO como ativo também. "pendente_matricula"
-- e "sem_matricula" continuam só com PENDENTE_MATRICULA de propósito —
-- quem está em EM_ACOLHIMENTO ainda não pode ser matriculado mesmo.
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
    count(*) filter (where status = 'PENDENTE_MATRICULA')::int,
    count(*) filter (where status = 'EM_DISCIPULADO' and attendance_rate < 75)::int,
    count(*) filter (
      where status in ('EM_ACOLHIMENTO', 'PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')
      and (last_contact_at is null or last_contact_at < now() - interval '30 days')
    )::int
  from discipleship_cases
  where congregation_id = auth_congregation_id();
$$;
