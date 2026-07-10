-- =============================================================
-- 013_record_attendance_batch.sql
-- Troca o loop linha-a-linha de record_attendance() por um único
-- INSERT ... SELECT em lote, com o mesmo upsert/conflito de antes.
--
-- Não altera os triggers de attendance_items (trg_attendance_recalculate,
-- trg_auto_module_progress): cada linha ainda dispara ambos, mas isso é
-- trabalho necessário — cada linha é um discipulando diferente, com seu
-- próprio case, então não há recomputação redundante ali. O ganho aqui é
-- só reduzir N statements sequenciais pra 1 statement em lote.
-- =============================================================

create or replace function record_attendance(
  p_lesson_id  uuid,
  p_items      jsonb,  -- array de {disciple_id, status, note}
  p_marked_by  uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into attendance_items (lesson_id, disciple_id, status, note, marked_by)
  select
    p_lesson_id,
    (item->>'disciple_id')::uuid,
    (item->>'status')::attendance_status,
    item->>'note',
    p_marked_by
  from jsonb_array_elements(p_items) as item
  on conflict (lesson_id, disciple_id)
  do update set
    status     = excluded.status,
    note       = excluded.note,
    marked_by  = excluded.marked_by,
    marked_at  = now(),
    updated_at = now();
end;
$$;
