-- =============================================================
-- 035_late_enrollment_makeup.sql
-- Vidas novas continuam entrando numa turma depois que ela já
-- começou. Até aqui o sistema não guardava nenhum sinal de que
-- essas aulas anteriores existem pro aluno novo — ele simplesmente
-- não tinha attendance_items pra elas, então ninguém sabia que
-- precisava repor.
--
-- Reaproveita o fluxo de reposição que já existe (aba "Reposições",
-- attendance_items.made_up) em vez de inventar um caminho novo: ao
-- matricular, cria uma linha FALTA sintética pra cada aula anterior
-- à matrícula, marcada com pre_enrollment=true. Essas linhas aparecem
-- na fila de reposição igual a uma falta normal, mas ficam de fora do
-- cálculo de frequência (recalculate_case_attendance) enquanto não
-- forem repostas — não é justo penalizar quem nem estava matriculado
-- ainda. Uma vez reposta (made_up=true, status vira PRESENTE via
-- resolve_makeup_attendance), passa a contar normalmente, como
-- qualquer reposição.
-- =============================================================

alter table attendance_items
  add column if not exists pre_enrollment boolean not null default false;

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
  v_enrolled_at     timestamptz;
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
  returning id, enrolled_at into v_enrollment_id, v_enrolled_at;

  -- Aulas que já aconteceram antes dessa matrícula viram pendência de
  -- reposição (não conta como falta normal, ver recalculate_case_attendance).
  -- Aula de reposição em si não entra aqui, não faz sentido repor uma reposição.
  insert into attendance_items (lesson_id, disciple_id, status, pre_enrollment, note, marked_by)
  select l.id, p_disciple_id, 'FALTA', true, 'Aula anterior à matrícula do discipulando na turma', p_created_by
  from lessons l
  where l.class_id = p_class_id
    and l.date < v_enrolled_at::date
    and l.makeup_for_lesson_id is null
  on conflict (lesson_id, disciple_id) do nothing;

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

  -- Conta chamadas do discipulando em aulas de turmas onde está matriculado,
  -- excluindo pendências de matrícula tardia ainda não repostas (pre_enrollment
  -- sem made_up) — assim que repostas, contam normalmente como presença.
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
  where ai.disciple_id = v_disciple_id
    and not (ai.pre_enrollment and not ai.made_up);

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
