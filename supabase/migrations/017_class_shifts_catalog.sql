-- =============================================================
-- 017_class_shifts_catalog.sql
-- Catálogo de turnos (Manhã/Tarde/Noite/...), configurável pelo admin
-- da congregação — mesmo padrão de 008_worship_services.sql. Substitui
-- o enum fixo class_shift em classes.shift e event_confirmations.class_shift
-- por uma FK pro catálogo novo. "Não informado" deixa de ser um valor
-- do catálogo: vira ausência de turno (shift_id/class_shift_id nulo).
--
-- As colunas antigas (classes.shift, event_confirmations.class_shift) não
-- são removidas — ficam como histórico congelado, sem uso pelo app a
-- partir de agora (mesmo racional de 016_contact_outcomes_fbv.sql:
-- Postgres não tem DROP VALUE de enum sem recriar o tipo, e apagar a
-- coluna seria destrutivo sem necessidade).
-- =============================================================

create table class_shifts (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references congregations(id) on delete restrict,
  name             text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Seed: um turno "real" (Manhã/Tarde/Noite) por congregação já existente,
-- pra classes/confirmações antigas terem pra onde apontar no backfill abaixo.
insert into class_shifts (congregation_id, name)
select id, turno
from congregations
cross join (values ('Manhã'), ('Tarde'), ('Noite')) as t(turno);

alter table classes
  add column shift_id uuid references class_shifts(id) on delete restrict;

update classes c
  set shift_id = cs.id
  from class_shifts cs
  where cs.congregation_id = c.congregation_id
    and (
      (c.shift = 'MANHA' and cs.name = 'Manhã') or
      (c.shift = 'TARDE' and cs.name = 'Tarde') or
      (c.shift = 'NOITE' and cs.name = 'Noite')
    );

alter table classes alter column shift drop not null;
alter table classes alter column shift drop default;

alter table event_confirmations
  add column class_shift_id uuid references class_shifts(id) on delete restrict;

update event_confirmations ec
  set class_shift_id = cs.id
  from discipleship_cases dc
  join class_shifts cs on cs.congregation_id = dc.congregation_id
  where dc.id = ec.case_id
    and (
      (ec.class_shift = 'MANHA' and cs.name = 'Manhã') or
      (ec.class_shift = 'TARDE' and cs.name = 'Tarde') or
      (ec.class_shift = 'NOITE' and cs.name = 'Noite')
    );

-- ---------------------------------------------------------------
-- CLASS_SHIFTS (RLS) — mesmo padrão de worship_services
-- ---------------------------------------------------------------

alter table class_shifts enable row level security;

create policy "class_shifts_select" on class_shifts for select
  using (
    is_platform_admin()
    or congregation_id = auth_congregation_id()
  );

create policy "class_shifts_insert" on class_shifts for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "class_shifts_update" on class_shifts for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "class_shifts_delete" on class_shifts for delete
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );
