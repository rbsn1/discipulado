-- =============================================================
-- 023_matricula_events_turma_name.sql
-- A linha do tempo do case hoje registra matrícula/desmatrícula
-- com descrição genérica ("Matriculado em turma" / "Desmatriculado
-- da turma"), sem dizer QUAL turma — usuário pediu pra aparecer
-- o registro de qual turma ele foi matriculado ou desmatriculado.
--
-- enroll_disciple já recebia p_class_id, só não usava o nome na
-- descrição. unenroll_disciple não sabia nem qual era a turma ativa
-- (só desativava por disciple_id) — agora captura antes de desativar.
-- =============================================================

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
  v_class_name      text;
begin
  -- Verificar se já tem matrícula ativa
  select id into v_existing_active
  from class_enrollments
  where disciple_id = p_disciple_id and active = true
  limit 1;

  if v_existing_active is not null then
    raise exception 'ALREADY_ENROLLED: discipulando já possui matrícula ativa em outra turma';
  end if;

  select name into v_class_name from classes where id = p_class_id;

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

  -- Registrar evento de matrícula, com o nome da turma
  insert into case_events (case_id, type, description, metadata, created_by)
  values (
    p_case_id,
    'MATRICULA',
    case
      when v_class_name is not null then 'Matriculado na turma "' || v_class_name || '"'
      else 'Matriculado em turma'
    end,
    jsonb_build_object('enrollment_id', v_enrollment_id, 'class_id', p_class_id),
    p_created_by
  );

  return v_enrollment_id;
end;
$$;

create or replace function unenroll_disciple(
  p_disciple_id   uuid,
  p_case_id       uuid,
  p_created_by    uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_class_id   uuid;
  v_class_name text;
begin
  select class_id into v_class_id
  from class_enrollments
  where disciple_id = p_disciple_id and active = true
  limit 1;

  if v_class_id is not null then
    select name into v_class_name from classes where id = v_class_id;
  end if;

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

  insert into case_events (case_id, type, description, metadata, created_by)
  values (
    p_case_id,
    'DESmatricula',
    case
      when v_class_name is not null then 'Desmatriculado da turma "' || v_class_name || '"'
      else 'Desmatriculado da turma'
    end,
    jsonb_build_object('class_id', v_class_id),
    p_created_by
  );
end;
$$;
