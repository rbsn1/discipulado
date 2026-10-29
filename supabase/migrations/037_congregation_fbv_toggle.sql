-- =============================================================
-- 037_congregation_fbv_toggle.sql
-- Liga/desliga a Festa de Boas Vindas por congregação.
--
-- Desde a 036 a FBV não é mais portão do fluxo (o acolhedor libera a
-- matrícula pelo contato "Aceitou participar"), então desligar só
-- esconde o recurso: some do menu e /confraternizacao redireciona.
-- Nenhum dado de events/event_confirmations é apagado — religar
-- traz tudo de volta.
--
-- Default true: congregações existentes continuam como estão.
-- Quem pode alterar: a policy congregations_update (004) já permite
-- ADMIN_DISCIPULADO na própria congregação e ADMIN_PLATAFORMA.
-- =============================================================

alter table congregations
  add column if not exists fbv_enabled boolean not null default true;

comment on column congregations.fbv_enabled is
  'Festa de Boas Vindas visível para esta congregação. false = some do menu e /confraternizacao redireciona; dados preservados.';
