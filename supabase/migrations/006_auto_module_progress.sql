-- =============================================================
-- 006_auto_module_progress.sql
-- Atualização automática do progresso de módulos pela chamada
--
-- Regra de negócio:
--   • Quando um aluno é marcado como PRESENTE em uma aula que
--     possui module_template_id, o case_module_progress desse
--     aluno para aquele módulo avança automaticamente:
--       NAO_INICIADO  → EM_ANDAMENTO   (aula com presença)
--
--   • A transição para CONCLUIDO continua sendo manual (pelo
--     discipulador), pois um módulo pode ter múltiplas aulas.
--
--   • Se a presença for removida/alterada para FALTA ou
--     JUSTIFICADA, o progresso NÃO regride — evita perda de
--     dados acidental.
-- =============================================================

-- ---------------------------------------------------------------
-- Função principal: avança módulo para EM_ANDAMENTO se PRESENTE
-- ---------------------------------------------------------------
create or replace function auto_advance_module_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_template_id  uuid;
  v_case_id             uuid;
begin
  -- Só age em inserção ou atualização para PRESENTE
  if (TG_OP = 'DELETE') then
    return old;
  end if;

  if new.status != 'PRESENTE' then
    return new;
  end if;

  -- Verifica se a aula está vinculada a um módulo
  select module_template_id
  into   v_module_template_id
  from   lessons
  where  id = new.lesson_id;

  if v_module_template_id is null then
    return new; -- aula sem módulo associado — sem ação
  end if;

  -- Encontra o case ativo do discipulando
  select id
  into   v_case_id
  from   discipleship_cases
  where  disciple_id = new.disciple_id
    and  status in ('EM_DISCIPULADO', 'PAUSADO', 'PENDENTE_MATRICULA')
  order by created_at desc
  limit 1;

  if v_case_id is null then
    return new; -- discipulando sem case ativo
  end if;

  -- Avança de NAO_INICIADO → EM_ANDAMENTO (nunca regride)
  update case_module_progress
  set
    status     = 'EM_ANDAMENTO',
    started_at = coalesce(started_at, now()),
    updated_at = now()
  where case_id            = v_case_id
    and module_template_id = v_module_template_id
    and status             = 'NAO_INICIADO';   -- só avança, nunca regride

  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Trigger: dispara após cada linha de chamada inserida/atualizada
-- ---------------------------------------------------------------
drop trigger if exists trg_auto_module_progress on attendance_items;

create trigger trg_auto_module_progress
  after insert or update of status
  on attendance_items
  for each row
  execute function auto_advance_module_progress();

-- ---------------------------------------------------------------
-- Comentários de documentação
-- ---------------------------------------------------------------
comment on function auto_advance_module_progress() is
  'Avança automaticamente case_module_progress de NAO_INICIADO para '
  'EM_ANDAMENTO quando o aluno é marcado como PRESENTE em uma aula '
  'associada a um módulo. A conclusão permanece manual.';
