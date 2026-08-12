-- =============================================================
-- 018_departments_catalog.sql
-- Catálogo de departamentos (Louvor, Células, EBD, Jovens...), configurável
-- pelo admin da congregação — mesmo padrão de 008_worship_services.sql e
-- 017_class_shifts_catalog.sql. Substitui o campo de texto livre
-- post_discipleship.department_name (sujeito a grafias inconsistentes) por
-- uma FK pro catálogo novo.
--
-- A coluna antiga (post_discipleship.department_name) não é removida — fica
-- como histórico congelado, sem uso pelo app a partir de agora (mesmo
-- racional das migrations anteriores, ex. 016_contact_outcomes_fbv.sql).
-- =============================================================

create table departments (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references congregations(id) on delete restrict,
  name             text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Seed: um departamento por valor distinto já usado em department_name,
-- por congregação — dados existentes têm pra onde apontar no backfill abaixo.
insert into departments (congregation_id, name)
select distinct dc.congregation_id, trim(pd.department_name)
from post_discipleship pd
join discipleship_cases dc on dc.id = pd.case_id
where pd.department_name is not null and trim(pd.department_name) <> '';

alter table post_discipleship
  add column department_id uuid references departments(id) on delete restrict;

update post_discipleship pd
  set department_id = d.id
  from discipleship_cases dc
  join departments d on d.congregation_id = dc.congregation_id
  where dc.id = pd.case_id
    and pd.department_name is not null
    and trim(pd.department_name) = d.name;

-- ---------------------------------------------------------------
-- DEPARTMENTS (RLS) — mesmo padrão de worship_services/class_shifts
-- ---------------------------------------------------------------

alter table departments enable row level security;

create policy "departments_select" on departments for select
  using (
    is_platform_admin()
    or congregation_id = auth_congregation_id()
  );

create policy "departments_insert" on departments for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "departments_update" on departments for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "departments_delete" on departments for delete
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );
