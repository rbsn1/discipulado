-- =============================================================
-- 026_security_hardening.sql
-- Resposta ao linter de segurança do Supabase. Só o que é seguro de
-- mudar sem risco de quebrar fluxo nenhum do app — cada item abaixo foi
-- checado contra o uso real no código antes de mudar:
--
--  1. set_updated_at sem search_path fixo (baixo risco, não é security
--     definer, mas o linter pede e o fix é trivial).
--  2. pg_trgm no schema public — só é usado em 2 índices GIN
--     (idx_disciples_name_trgm/phone_trgm, 010_performance_indexes.sql);
--     mover de schema não invalida índice já criado.
--  3. Policy pública de storage.objects em congregation-logos permitia
--     LISTAR todos os arquivos do bucket, não só buscar por URL — e o
--     upload/list/remove do app já usa o client admin/service role
--     (bypassa RLS), então essa policy nunca foi necessária pro app
--     funcionar (src/app/api/admin/congregations/[id]/logo/route.ts).
--  4. Funções security definer chamáveis por `anon` sem nenhuma
--     necessidade — o app inteiro exige login antes de qualquer chamada,
--     nenhum fluxo legítimo é anônimo.
--  5. Funções de trigger (nunca deveriam ser RPC pública) — revogar
--     EXECUTE não afeta o disparo do trigger em si, só bloqueia chamada
--     direta via /rest/v1/rpc/...
--  6. auto_advance_case_after_fbv_confirmation() é órfã desde a 021
--     (substituída por trg_fn_confirmation_attended/trg_fn_event_realizado)
--     — já tinha sido flagada, nunca removida; removendo agora.
--
-- NÃO mexe no acesso de `authenticated` às RPCs de mutação (enroll_disciple,
-- conclude_case, record_attendance, register_congregation_payment etc.) —
-- isso é decisão maior (precisaria de checagem de papel/congregação DENTRO
-- de cada função), tratada à parte, não nesta migration.
-- =============================================================

alter function set_updated_at() set search_path = public;

create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

drop policy if exists logos_public_read on storage.objects;

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
from anon;

revoke execute on function
  auto_advance_module_progress(),
  guard_profile_sensitive_update(),
  handle_new_user(),
  set_updated_at(),
  trg_fn_confirmation_attended(),
  trg_fn_confirmation_removed_or_unattended(),
  trg_fn_event_realizado(),
  trg_recalculate_attendance_fn()
from anon, authenticated;

drop function if exists auto_advance_case_after_fbv_confirmation();
