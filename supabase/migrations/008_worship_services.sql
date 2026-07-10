-- =============================================================
-- 008_worship_services.sql
-- Catálogo de cultos (origem do cadastro), configurável por congregação
-- =============================================================

create table worship_services (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references congregations(id) on delete restrict,
  name             text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table disciples
  add column worship_service_id uuid references worship_services(id) on delete restrict;

-- ---------------------------------------------------------------
-- WORSHIP_SERVICES (RLS)
-- ---------------------------------------------------------------

alter table worship_services enable row level security;

create policy "worship_services_select" on worship_services for select
  using (
    is_platform_admin()
    or congregation_id = auth_congregation_id()
  );

create policy "worship_services_insert" on worship_services for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "worship_services_update" on worship_services for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "worship_services_delete" on worship_services for delete
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );
