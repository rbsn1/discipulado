-- =============================================================
-- 025_makeup_lessons.sql
-- Processo de reposição de aula: cria uma aula de reposição "derivada"
-- da aula perdida (lessons.makeup_for_lesson_id aponta pra ela) — quando
-- a chamada dessa reposição é feita, quem compareceu tem a FALTA/falta
-- justificada da aula ORIGINAL convertida direto pra PRESENTE (decisão
-- explícita do usuário: sem duplicar registro, só 1 aula conta).
--
-- resolve_makeup_attendance é security definer e não valida
-- congregation_id — mesmo padrão de record_attendance (013), a
-- autorização já é feita na camada de API antes de chamar.
-- =============================================================

alter table lessons
  add column if not exists makeup_for_lesson_id uuid references lessons(id) on delete set null;

create index if not exists idx_lessons_makeup_for
  on lessons(makeup_for_lesson_id)
  where makeup_for_lesson_id is not null;

create or replace function resolve_makeup_attendance(
  p_lesson_id    uuid,   -- aula ORIGINAL (perdida), não a de reposição
  p_disciple_ids uuid[],
  p_marked_by    uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update attendance_items
  set
    status     = 'PRESENTE',
    made_up    = true,
    marked_by  = p_marked_by,
    marked_at  = now(),
    updated_at = now()
  where lesson_id = p_lesson_id
    and disciple_id = any(p_disciple_ids)
    and status in ('FALTA', 'JUSTIFICADA');
end;
$$;
