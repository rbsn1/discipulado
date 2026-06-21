-- =============================================================
-- 002_rls_policies.sql
-- Políticas de Row Level Security
-- =============================================================

-- Habilitar RLS em todas as tabelas operacionais
alter table congregations enable row level security;
alter table profiles enable row level security;
alter table disciples enable row level security;
alter table discipleship_cases enable row level security;
alter table module_templates enable row level security;
alter table case_module_progress enable row level security;
alter table classes enable row level security;
alter table class_enrollments enable row level security;
alter table lessons enable row level security;
alter table attendance_items enable row level security;
alter table contact_attempts enable row level security;
alter table events enable row level security;
alter table event_confirmations enable row level security;
alter table case_events enable row level security;
alter table post_discipleship enable row level security;

-- ---------------------------------------------------------------
-- Funções auxiliares de contexto
-- ---------------------------------------------------------------

-- Retorna o perfil do usuário autenticado
create or replace function auth_profile()
returns profiles
language sql stable security definer
set search_path = public
as $$
  select * from profiles where id = auth.uid() and is_active = true limit 1;
$$;

-- Retorna a congregation_id do usuário autenticado
create or replace function auth_congregation_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select congregation_id from profiles where id = auth.uid() and is_active = true limit 1;
$$;

-- Retorna o role do usuário autenticado
create or replace function auth_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid() and is_active = true limit 1;
$$;

-- Verifica se o usuário é admin de plataforma
create or replace function is_platform_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles
    where id = auth.uid()
      and role = 'ADMIN_PLATAFORMA'
      and is_active = true
  );
$$;

-- Verifica se o usuário pertence à congregação informada
create or replace function belongs_to_congregation(cong_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles
    where id = auth.uid()
      and congregation_id = cong_id
      and is_active = true
  );
$$;

-- Verifica se o usuário tem pelo menos um dos roles informados
create or replace function has_role(roles user_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles
    where id = auth.uid()
      and role = any(roles)
      and is_active = true
  );
$$;

-- ---------------------------------------------------------------
-- CONGREGATIONS
-- ---------------------------------------------------------------

-- Leitura: admin plataforma vê todas; demais vêem apenas a sua
create policy "congregations_select" on congregations for select
  using (
    is_platform_admin()
    or id = auth_congregation_id()
  );

-- Escrita: somente admin plataforma
create policy "congregations_insert" on congregations for insert
  with check (is_platform_admin());

create policy "congregations_update" on congregations for update
  using (is_platform_admin());

create policy "congregations_delete" on congregations for delete
  using (is_platform_admin());

-- ---------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------

-- Leitura: admin plataforma vê todos; admin discipulado vê sua congregação; usuário vê o próprio
create policy "profiles_select" on profiles for select
  using (
    is_platform_admin()
    or (congregation_id = auth_congregation_id() and has_role(array['ADMIN_DISCIPULADO', 'SM_DISCIPULADO']::user_role[]))
    or id = auth.uid()
  );

-- Insert: admin plataforma cria qualquer perfil; admin discipulado cria na sua congregação
create policy "profiles_insert" on profiles for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
      and role != 'ADMIN_PLATAFORMA'
    )
  );

-- Update: admin plataforma edita todos; admin discipulado edita perfis da sua congregação; usuário edita o próprio
create policy "profiles_update" on profiles for update
  using (
    is_platform_admin()
    or (congregation_id = auth_congregation_id() and has_role(array['ADMIN_DISCIPULADO']::user_role[]))
    or id = auth.uid()
  );

-- ---------------------------------------------------------------
-- DISCIPLES
-- ---------------------------------------------------------------

create policy "disciples_select" on disciples for select
  using (
    is_platform_admin()
    or congregation_id = auth_congregation_id()
  );

create policy "disciples_insert" on disciples for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array[
        'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
      ]::user_role[])
    )
  );

create policy "disciples_update" on disciples for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array[
        'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
      ]::user_role[])
    )
  );

-- Soft delete apenas (sem delete físico de disciples com cases)
create policy "disciples_delete" on disciples for delete
  using (is_platform_admin());

-- ---------------------------------------------------------------
-- DISCIPLESHIP_CASES
-- ---------------------------------------------------------------

create policy "cases_select" on discipleship_cases for select
  using (
    is_platform_admin()
    or congregation_id = auth_congregation_id()
  );

create policy "cases_insert" on discipleship_cases for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array[
        'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
      ]::user_role[])
    )
  );

create policy "cases_update" on discipleship_cases for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array[
        'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
      ]::user_role[])
    )
  );

-- Não permitir deletar case concluído
create policy "cases_delete" on discipleship_cases for delete
  using (
    is_platform_admin()
    and status != 'CONCLUIDO'
  );

-- ---------------------------------------------------------------
-- MODULE_TEMPLATES
-- ---------------------------------------------------------------

create policy "module_templates_select" on module_templates for select
  using (
    is_platform_admin()
    or congregation_id = auth_congregation_id()
  );

create policy "module_templates_insert" on module_templates for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "module_templates_update" on module_templates for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "module_templates_delete" on module_templates for delete
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

-- ---------------------------------------------------------------
-- CASE_MODULE_PROGRESS
-- ---------------------------------------------------------------

create policy "case_module_progress_select" on case_module_progress for select
  using (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
    )
  );

create policy "case_module_progress_insert" on case_module_progress for insert
  with check (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
    )
  );

create policy "case_module_progress_update" on case_module_progress for update
  using (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
    )
  );

-- ---------------------------------------------------------------
-- CLASSES
-- ---------------------------------------------------------------

create policy "classes_select" on classes for select
  using (
    is_platform_admin()
    or congregation_id = auth_congregation_id()
  );

create policy "classes_insert" on classes for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO','DISCIPULADOR']::user_role[])
    )
  );

create policy "classes_update" on classes for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO','DISCIPULADOR']::user_role[])
    )
  );

create policy "classes_delete" on classes for delete
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

-- ---------------------------------------------------------------
-- CLASS_ENROLLMENTS
-- ---------------------------------------------------------------

create policy "enrollments_select" on class_enrollments for select
  using (
    is_platform_admin()
    or exists(
      select 1 from classes c
      where c.id = class_id
        and c.congregation_id = auth_congregation_id()
    )
  );

create policy "enrollments_insert" on class_enrollments for insert
  with check (
    is_platform_admin()
    or exists(
      select 1 from classes c
      where c.id = class_id
        and c.congregation_id = auth_congregation_id()
        and has_role(array['ADMIN_DISCIPULADO','DISCIPULADOR','SM_DISCIPULADO']::user_role[])
    )
  );

create policy "enrollments_update" on class_enrollments for update
  using (
    is_platform_admin()
    or exists(
      select 1 from classes c
      where c.id = class_id
        and c.congregation_id = auth_congregation_id()
        and has_role(array['ADMIN_DISCIPULADO','DISCIPULADOR','SM_DISCIPULADO']::user_role[])
    )
  );

-- ---------------------------------------------------------------
-- LESSONS
-- ---------------------------------------------------------------

create policy "lessons_select" on lessons for select
  using (
    is_platform_admin()
    or exists(
      select 1 from classes c
      where c.id = class_id
        and c.congregation_id = auth_congregation_id()
    )
  );

create policy "lessons_insert" on lessons for insert
  with check (
    is_platform_admin()
    or exists(
      select 1 from classes c
      where c.id = class_id
        and c.congregation_id = auth_congregation_id()
        and has_role(array['ADMIN_DISCIPULADO','DISCIPULADOR']::user_role[])
    )
  );

create policy "lessons_update" on lessons for update
  using (
    is_platform_admin()
    or exists(
      select 1 from classes c
      where c.id = class_id
        and c.congregation_id = auth_congregation_id()
        and has_role(array['ADMIN_DISCIPULADO','DISCIPULADOR']::user_role[])
    )
  );

create policy "lessons_delete" on lessons for delete
  using (
    is_platform_admin()
    or exists(
      select 1 from classes c
      where c.id = class_id
        and c.congregation_id = auth_congregation_id()
        and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

-- ---------------------------------------------------------------
-- ATTENDANCE_ITEMS
-- ---------------------------------------------------------------

create policy "attendance_select" on attendance_items for select
  using (
    is_platform_admin()
    or exists(
      select 1 from lessons l
      join classes c on c.id = l.class_id
      where l.id = lesson_id
        and c.congregation_id = auth_congregation_id()
    )
  );

create policy "attendance_insert" on attendance_items for insert
  with check (
    is_platform_admin()
    or exists(
      select 1 from lessons l
      join classes c on c.id = l.class_id
      where l.id = lesson_id
        and c.congregation_id = auth_congregation_id()
        and has_role(array['ADMIN_DISCIPULADO','DISCIPULADOR']::user_role[])
    )
  );

create policy "attendance_update" on attendance_items for update
  using (
    is_platform_admin()
    or exists(
      select 1 from lessons l
      join classes c on c.id = l.class_id
      where l.id = lesson_id
        and c.congregation_id = auth_congregation_id()
        and has_role(array['ADMIN_DISCIPULADO','DISCIPULADOR']::user_role[])
    )
  );

-- ---------------------------------------------------------------
-- CONTACT_ATTEMPTS
-- ---------------------------------------------------------------

create policy "contacts_select" on contact_attempts for select
  using (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
    )
  );

create policy "contacts_insert" on contact_attempts for insert
  with check (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
        and has_role(array[
          'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
        ]::user_role[])
    )
  );

-- ---------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------

create policy "events_select" on events for select
  using (
    is_platform_admin()
    or congregation_id = auth_congregation_id()
  );

create policy "events_insert" on events for insert
  with check (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

create policy "events_update" on events for update
  using (
    is_platform_admin()
    or (
      congregation_id = auth_congregation_id()
      and has_role(array['ADMIN_DISCIPULADO']::user_role[])
    )
  );

-- ---------------------------------------------------------------
-- EVENT_CONFIRMATIONS
-- ---------------------------------------------------------------

create policy "event_confirmations_select" on event_confirmations for select
  using (
    is_platform_admin()
    or exists(
      select 1 from events e
      where e.id = event_id
        and e.congregation_id = auth_congregation_id()
    )
  );

create policy "event_confirmations_insert" on event_confirmations for insert
  with check (
    is_platform_admin()
    or exists(
      select 1 from events e
      where e.id = event_id
        and e.congregation_id = auth_congregation_id()
        and has_role(array[
          'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
        ]::user_role[])
    )
  );

create policy "event_confirmations_update" on event_confirmations for update
  using (
    is_platform_admin()
    or exists(
      select 1 from events e
      where e.id = event_id
        and e.congregation_id = auth_congregation_id()
        and has_role(array[
          'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
        ]::user_role[])
    )
  );

-- ---------------------------------------------------------------
-- CASE_EVENTS
-- ---------------------------------------------------------------

create policy "case_events_select" on case_events for select
  using (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
    )
  );

create policy "case_events_insert" on case_events for insert
  with check (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
    )
  );

-- Linha do tempo é imutável
create policy "case_events_no_update" on case_events for update
  using (false);

create policy "case_events_no_delete" on case_events for delete
  using (false);

-- ---------------------------------------------------------------
-- POST_DISCIPLESHIP
-- ---------------------------------------------------------------

create policy "post_discipleship_select" on post_discipleship for select
  using (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
    )
  );

create policy "post_discipleship_insert" on post_discipleship for insert
  with check (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
        and has_role(array[
          'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
        ]::user_role[])
    )
  );

create policy "post_discipleship_update" on post_discipleship for update
  using (
    is_platform_admin()
    or exists(
      select 1 from discipleship_cases dc
      where dc.id = case_id
        and dc.congregation_id = auth_congregation_id()
        and has_role(array[
          'ADMIN_DISCIPULADO','DISCIPULADOR','SECRETARIA_DISCIPULADO','SM_DISCIPULADO'
        ]::user_role[])
    )
  );
