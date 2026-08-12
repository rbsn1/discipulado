-- =============================================================
-- 022_em_acolhimento_revert.sql
-- Regra de negócio: desconfirmar a presença numa Festa de Boas Vindas
-- (removendo a confirmação inteira, não só desmarcando o checkbox)
-- reverte o case de PENDENTE_MATRICULA de volta pra EM_ACOLHIMENTO —
-- desde que ele ainda não tenha avançado mais (ex.: já matriculado numa
-- turma). Isso é uma mudança de propósito em relação à 021, que
-- deliberadamente nunca regredia sozinha; o usuário pediu esse
-- comportamento explicitamente depois de ver o resultado na prática.
--
-- Dispara em dois casos, espelhando os dois gatilhos de avanço da 021:
--   1. DELETE em event_confirmations (linha removida inteira — como o
--      app agora faz quando confirmado E presente ficam falsos).
--   2. UPDATE em event_confirmations quando attended vira false (defesa
--      extra, caso algo atualize sem apagar a linha).
-- =============================================================

create or replace function revert_case_after_fbv_confirmation_removed(p_case_id uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update discipleship_cases
  set
    status     = 'EM_ACOLHIMENTO',
    updated_at = now()
  where id = p_case_id
    and status = 'PENDENTE_MATRICULA';

  if found then
    insert into case_events (case_id, type, description, created_by)
    values (
      p_case_id,
      'ACOLHIMENTO',
      'Confirmação de presença na Festa de Boas Vindas removida — matrícula bloqueada novamente',
      p_actor
    );
  end if;
end;
$$;

create or replace function trg_fn_confirmation_removed_or_unattended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    if old.attended is true then
      perform revert_case_after_fbv_confirmation_removed(old.case_id, old.created_by);
    end if;
    return old;
  end if;

  -- UPDATE: só age quando attended estava true e passou a não ser true
  if old.attended is true and new.attended is not true then
    perform revert_case_after_fbv_confirmation_removed(new.case_id, new.created_by);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_revert_case_after_fbv_removed on event_confirmations;

create trigger trg_revert_case_after_fbv_removed
  after update of attended or delete
  on event_confirmations
  for each row
  execute function trg_fn_confirmation_removed_or_unattended();
