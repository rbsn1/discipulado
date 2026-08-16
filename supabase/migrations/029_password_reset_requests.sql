-- =============================================================
-- 029_password_reset_requests.sql
-- "Esqueci minha senha" sem depender de e-mail (não há SMTP configurado
-- neste projeto, só o remetente padrão limitado da Supabase) — o pedido
-- vira um registro visível pro admin da congregação no painel, que
-- redefine a senha manualmente em /admin/usuarios e avisa a pessoa por
-- fora (WhatsApp/telefone). Decisão explícita do usuário.
--
-- Inserção só acontece via service role (Server Action rodando sem
-- sessão, chamado da tela de login) — por isso não tem policy de
-- insert aqui, o padrão é negar por default pra anon/authenticated.
-- =============================================================

create table password_reset_requests (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  congregation_id uuid not null references congregations(id) on delete cascade,
  requested_at    timestamptz not null default now(),
  resolved        boolean not null default false,
  resolved_at     timestamptz,
  resolved_by     uuid references profiles(id)
);

create index idx_password_reset_requests_pending
  on password_reset_requests(congregation_id)
  where resolved = false;

alter table password_reset_requests enable row level security;

create policy "password_reset_requests_select" on password_reset_requests for select
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "password_reset_requests_update" on password_reset_requests for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );
