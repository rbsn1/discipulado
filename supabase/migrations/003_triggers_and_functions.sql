-- =============================================================
-- 003_triggers_and_functions.sql
-- Triggers de negócio, RPCs e funções de cálculo
-- =============================================================

-- ---------------------------------------------------------------
-- Função: recalcular frequência de um case
-- ---------------------------------------------------------------
create or replace function recalculate_case_attendance(p_case_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_present  int := 0;
  v_justified int := 0;
  v_absent   int := 0;
  v_total    int := 0;
  v_rate     numeric(5,2) := 0;
  v_disciple_id uuid;
begin
  -- Busca o discipulando do case
  select disciple_id into v_disciple_id
  from discipleship_cases where id = p_case_id;

  -- Conta chamadas do discipulando em aulas de turmas onde está matriculado
  select
    count(*) filter (where ai.status = 'PRESENTE') as present,
    count(*) filter (where ai.status = 'JUSTIFICADA') as justified,
    count(*) filter (where ai.status = 'FALTA') as absent,
    count(*) as total
  into v_present, v_justified, v_absent, v_total
  from attendance_items ai
  join lessons l on l.id = ai.lesson_id
  join class_enrollments ce on ce.class_id = l.class_id
    and ce.disciple_id = v_disciple_id
  where ai.disciple_id = v_disciple_id;

  -- Frequência = presentes / total_com_status * 100
  -- Justificadas contam como registrada mas não como presença
  if v_total > 0 then
    v_rate := round((v_present::numeric / v_total) * 100, 2);
  end if;

  update discipleship_cases
  set
    total_lessons   = v_total,
    present_count   = v_present,
    justified_count = v_justified,
    absence_count   = v_absent,
    attendance_rate = v_rate,
    updated_at      = now()
  where id = p_case_id;
end;
$$;

-- ---------------------------------------------------------------
-- Trigger: recalcular frequência ao inserir/atualizar/deletar chamada
-- ---------------------------------------------------------------
create or replace function trg_recalculate_attendance_fn()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_disciple_id uuid;
begin
  -- Descobre o discipulando da chamada
  v_disciple_id := coalesce(new.disciple_id, old.disciple_id);

  -- Encontra o case ativo deste discipulando
  select id into v_case_id
  from discipleship_cases
  where disciple_id = v_disciple_id
    and status in ('EM_DISCIPULADO', 'PAUSADO', 'CONCLUIDO')
  order by created_at desc
  limit 1;

  if v_case_id is not null then
    perform recalculate_case_attendance(v_case_id);
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_attendance_recalculate
  after insert or update or delete on attendance_items
  for each row execute function trg_recalculate_attendance_fn();

-- ---------------------------------------------------------------
-- RPC: criar case + progresso de módulos (transação atômica)
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
    and status in ('PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')
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
    p_disciple_id, p_congregation_id, 'PENDENTE_MATRICULA', 'ACOLHIMENTO',
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
-- RPC: matricular discipulando em turma
-- ---------------------------------------------------------------
create or replace function enroll_disciple(
  p_disciple_id   uuid,
  p_class_id      uuid,
  p_case_id       uuid,
  p_created_by    uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_enrollment_id   uuid;
  v_existing_active uuid;
begin
  -- Verificar se já tem matrícula ativa
  select id into v_existing_active
  from class_enrollments
  where disciple_id = p_disciple_id and active = true
  limit 1;

  if v_existing_active is not null then
    raise exception 'ALREADY_ENROLLED: discipulando já possui matrícula ativa em outra turma';
  end if;

  -- Criar matrícula
  insert into class_enrollments (class_id, disciple_id, active, created_by)
  values (p_class_id, p_disciple_id, true, p_created_by)
  returning id into v_enrollment_id;

  -- Promover case para EM_DISCIPULADO e etapa DISCIPULADO
  update discipleship_cases
  set
    status      = 'EM_DISCIPULADO',
    stage       = 'DISCIPULADO',
    updated_at  = now()
  where id = p_case_id
    and status = 'PENDENTE_MATRICULA';

  -- Registrar evento de matrícula
  insert into case_events (case_id, type, description, metadata, created_by)
  values (
    p_case_id,
    'MATRICULA',
    'Matriculado em turma',
    jsonb_build_object('enrollment_id', v_enrollment_id, 'class_id', p_class_id),
    p_created_by
  );

  return v_enrollment_id;
end;
$$;

-- ---------------------------------------------------------------
-- RPC: desmatricular discipulando
-- ---------------------------------------------------------------
create or replace function unenroll_disciple(
  p_disciple_id   uuid,
  p_case_id       uuid,
  p_created_by    uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update class_enrollments
  set active = false, updated_at = now()
  where disciple_id = p_disciple_id and active = true;

  -- Retorna case para PENDENTE_MATRICULA
  update discipleship_cases
  set
    status     = 'PENDENTE_MATRICULA',
    stage      = 'ACOLHIMENTO',
    updated_at = now()
  where id = p_case_id
    and status = 'EM_DISCIPULADO';

  insert into case_events (case_id, type, description, created_by)
  values (p_case_id, 'DESmatricula', 'Desmatriculado da turma', p_created_by);
end;
$$;

-- ---------------------------------------------------------------
-- RPC: concluir case (valida requisitos antes de concluir)
-- ---------------------------------------------------------------
create or replace function conclude_case(
  p_case_id    uuid,
  p_created_by uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_case          discipleship_cases%rowtype;
  v_pending_mods  int;
  v_has_attendance boolean;
begin
  select * into v_case from discipleship_cases where id = p_case_id;

  if not found then
    raise exception 'CASE_NOT_FOUND: case não encontrado';
  end if;

  if v_case.status = 'CONCLUIDO' then
    raise exception 'ALREADY_CONCLUDED: case já está concluído';
  end if;

  -- Verificar módulos pendentes
  select count(*) into v_pending_mods
  from case_module_progress
  where case_id = p_case_id and status != 'CONCLUIDO';

  if v_pending_mods > 0 then
    raise exception 'PENDING_MODULES: existem % módulo(s) não concluído(s)', v_pending_mods;
  end if;

  -- Verificar ao menos uma chamada
  if v_case.total_lessons = 0 then
    raise exception 'NO_ATTENDANCE: nenhuma chamada registrada para este discipulando';
  end if;

  -- Verificar frequência mínima
  if v_case.attendance_rate < 75 then
    raise exception 'LOW_ATTENDANCE: frequência %.2f%% abaixo do mínimo de 75%%', v_case.attendance_rate;
  end if;

  -- Concluir
  update discipleship_cases
  set status = 'CONCLUIDO', updated_at = now()
  where id = p_case_id;

  insert into case_events (case_id, type, description, metadata, created_by)
  values (
    p_case_id,
    'CONCLUSAO',
    'Discipulado concluído',
    jsonb_build_object(
      'attendance_rate', v_case.attendance_rate,
      'total_lessons',   v_case.total_lessons
    ),
    p_created_by
  );
end;
$$;

-- ---------------------------------------------------------------
-- RPC: iniciar pós-discipulado
-- ---------------------------------------------------------------
create or replace function start_post_discipleship(
  p_case_id    uuid,
  p_created_by uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  -- Só permitir em cases concluídos
  if not exists(
    select 1 from discipleship_cases
    where id = p_case_id and status = 'CONCLUIDO'
  ) then
    raise exception 'CASE_NOT_CONCLUDED: somente cases concluídos podem entrar em pós-discipulado';
  end if;

  -- Atualizar etapa para POS_DISCIPULADO
  update discipleship_cases
  set stage = 'POS_DISCIPULADO', updated_at = now()
  where id = p_case_id;

  -- Criar registro de pós-discipulado se não existir
  insert into post_discipleship (case_id, updated_by)
  values (p_case_id, p_created_by)
  on conflict (case_id) do nothing;

  insert into case_events (case_id, type, description, created_by)
  values (p_case_id, 'POS_DISCIPULADO', 'Acompanhamento pós-discipulado iniciado', p_created_by);
end;
$$;

-- ---------------------------------------------------------------
-- RPC: registrar chamada completa de uma aula (upsert em lote)
-- ---------------------------------------------------------------
create or replace function record_attendance(
  p_lesson_id  uuid,
  p_items      jsonb,  -- array de {disciple_id, status, note}
  p_marked_by  uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_item jsonb;
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into attendance_items (lesson_id, disciple_id, status, note, marked_by)
    values (
      p_lesson_id,
      (v_item->>'disciple_id')::uuid,
      (v_item->>'status')::attendance_status,
      v_item->>'note',
      p_marked_by
    )
    on conflict (lesson_id, disciple_id)
    do update set
      status    = excluded.status,
      note      = excluded.note,
      marked_by = excluded.marked_by,
      marked_at = now(),
      updated_at = now();
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- Trigger: criar perfil automaticamente ao criar usuário Auth
-- ---------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- Apenas cria se vier metadata com role
  if (new.raw_user_meta_data->>'role') is not null then
    insert into profiles (id, name, email, congregation_id, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', new.email),
      new.email,
      (new.raw_user_meta_data->>'congregation_id')::uuid,
      (new.raw_user_meta_data->>'role')::user_role
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------
-- Constraints adicionais
-- ---------------------------------------------------------------

-- Não permitir mais de um case ativo por discipulando
-- (verificado na RPC; constraint parcial como segunda defesa)
create unique index idx_cases_one_active_per_disciple
  on discipleship_cases (disciple_id)
  where status in ('PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO');

-- Não permitir mais de uma matrícula ativa por discipulando
create unique index idx_enrollments_one_active_per_disciple
  on class_enrollments (disciple_id)
  where active = true;
