-- =============================================================
-- 027_security_hardening_fix.sql
-- Correção da 026: revogar EXECUTE de `anon`/`authenticated`
-- especificamente não teve efeito nenhum, porque nenhuma das duas tinha
-- concessão DIRETA — o acesso vinha inteiro de PUBLIC (pseudo-papel que
-- todo mundo herda automaticamente no Postgres, `=X/postgres` no ACL).
-- Revogar de um papel que só herda via PUBLIC não revoga o PUBLIC.
--
-- Conferido antes de aplicar: as 19 funções de negócio (enroll_disciple,
-- conclude_case, record_attendance, register_congregation_payment etc.)
-- JÁ têm concessão direta pra `authenticated` (e `service_role`),
-- independente de PUBLIC — revogar de PUBLIC tira só o `anon`, sem
-- quebrar nenhum fluxo autenticado do app.
--
-- As 8 funções de trigger não têm concessão direta pra `authenticated`
-- nenhuma — todo o acesso delas vem só de PUBLIC. Revogar de PUBLIC
-- fecha o acesso tanto de anon quanto de authenticated, como já era a
-- intenção da 026.
-- =============================================================

revoke execute on function
  advance_case_after_fbv_confirmation(uuid, uuid),
  auth_congregation_id(),
  auth_profile(),
  auth_role(),
  belongs_to_congregation(uuid),
  conclude_case(uuid, uuid),
  create_discipleship_case(uuid, uuid, uuid, date, text, uuid),
  enroll_disciple(uuid, uuid, uuid, uuid),
  get_dashboard_stats(),
  get_my_access_status(),
  get_report_stats(),
  has_role(user_role[]),
  is_platform_admin(),
  recalculate_case_attendance(uuid),
  record_attendance(uuid, jsonb, uuid),
  register_congregation_payment(uuid, date, numeric, text),
  resolve_makeup_attendance(uuid, uuid[], uuid),
  revert_case_after_fbv_confirmation_removed(uuid, uuid),
  start_post_discipleship(uuid, uuid),
  unenroll_disciple(uuid, uuid, uuid)
from public;

revoke execute on function
  auto_advance_module_progress(),
  guard_profile_sensitive_update(),
  handle_new_user(),
  set_updated_at(),
  trg_fn_confirmation_attended(),
  trg_fn_confirmation_removed_or_unattended(),
  trg_fn_event_realizado(),
  trg_recalculate_attendance_fn()
from public;
