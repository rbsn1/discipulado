-- =============================================================
-- 001_initial_schema.sql
-- Schema principal do módulo de discipulado
-- =============================================================

-- Habilitar extensão UUID
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------

create type user_role as enum (
  'ADMIN_PLATAFORMA',
  'ADMIN_DISCIPULADO',
  'DISCIPULADOR',
  'SECRETARIA_DISCIPULADO',
  'SM_DISCIPULADO'
);

create type case_status as enum (
  'PENDENTE_MATRICULA',
  'EM_DISCIPULADO',
  'PAUSADO',
  'CONCLUIDO'
);

create type case_stage as enum (
  'ACOLHIMENTO',
  'DISCIPULADO',
  'POS_DISCIPULADO'
);

create type module_progress_status as enum (
  'NAO_INICIADO',
  'EM_ANDAMENTO',
  'CONCLUIDO'
);

create type class_shift as enum (
  'MANHA',
  'TARDE',
  'NOITE',
  'NAO_INFORMADO'
);

create type attendance_status as enum (
  'PRESENTE',
  'FALTA',
  'JUSTIFICADA'
);

create type contact_outcome as enum (
  'ATENDEU',
  'NAO_ATENDEU',
  'MENSAGEM_ENVIADA',
  'VISITA_REALIZADA'
);

create type event_type as enum (
  'CONFRATERNIZACAO'
);

create type event_status as enum (
  'PLANEJADO',
  'REALIZADO',
  'CANCELADO'
);

create type integration_status as enum (
  'PENDENTE',
  'EM_ANDAMENTO',
  'INTEGRADO',
  'DESISTIU'
);

create type baptism_status as enum (
  'NAO_BATIZADO',
  'BATIZADO',
  'AGENDADO'
);

create type case_event_type as enum (
  'CADASTRO',
  'ACOLHIMENTO',
  'MATRICULA',
  'DESmatricula',
  'MODULO_INICIADO',
  'MODULO_CONCLUIDO',
  'CHAMADA',
  'CONTATO',
  'PAUSA',
  'RETOMADA',
  'CONCLUSAO',
  'POS_DISCIPULADO',
  'NOTA'
);

-- ---------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------

-- Congregações (tenant raiz)
create table congregations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text not null default 'America/Sao_Paulo',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Perfis de usuário (ligado ao Supabase Auth)
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  email           text not null,
  congregation_id uuid references congregations(id) on delete restrict,
  role            user_role not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Discipulandos
create table disciples (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references congregations(id) on delete restrict,
  full_name        text not null,
  phone            text,
  email            text,
  birth_date       date,
  address          text,
  conversion_date  date,
  origin           text,
  notes            text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Telefone único por congregação quando preenchido
  constraint disciples_phone_congregation_unique unique (congregation_id, phone)
);

-- Cases de discipulado
create table discipleship_cases (
  id                    uuid primary key default gen_random_uuid(),
  disciple_id           uuid not null references disciples(id) on delete restrict,
  congregation_id       uuid not null references congregations(id) on delete restrict,
  status                case_status not null default 'PENDENTE_MATRICULA',
  stage                 case_stage not null default 'ACOLHIMENTO',
  assigned_to           uuid references profiles(id),
  welcomed_on           date,
  notes                 text,
  total_lessons         int not null default 0,
  present_count         int not null default 0,
  justified_count       int not null default 0,
  absence_count         int not null default 0,
  attendance_rate       numeric(5,2) not null default 0,
  last_contact_at       timestamptz,
  created_by            uuid references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Templates de módulos (catálogo da congregação)
create table module_templates (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references congregations(id) on delete restrict,
  title            text not null,
  description      text,
  sort_order       int not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Progresso de módulos por case
create table case_module_progress (
  case_id             uuid not null references discipleship_cases(id) on delete cascade,
  module_template_id  uuid not null references module_templates(id) on delete restrict,
  status              module_progress_status not null default 'NAO_INICIADO',
  started_at          timestamptz,
  completed_at        timestamptz,
  completed_by        uuid references profiles(id),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (case_id, module_template_id)
);

-- Turmas
create table classes (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references congregations(id) on delete restrict,
  name             text not null,
  shift            class_shift not null default 'NAO_INFORMADO',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Matrículas
create table class_enrollments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete restrict,
  disciple_id uuid not null references disciples(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  active      boolean not null default true,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Aulas
create table lessons (
  id                  uuid primary key default gen_random_uuid(),
  class_id            uuid not null references classes(id) on delete restrict,
  date                date not null,
  topic               text,
  module_template_id  uuid references module_templates(id),
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint lessons_class_date_unique unique (class_id, date)
);

-- Chamadas
create table attendance_items (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references lessons(id) on delete cascade,
  disciple_id uuid not null references disciples(id) on delete restrict,
  status      attendance_status not null,
  note        text,
  marked_at   timestamptz not null default now(),
  marked_by   uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint attendance_lesson_disciple_unique unique (lesson_id, disciple_id)
);

-- Tentativas de contato
create table contact_attempts (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references discipleship_cases(id) on delete cascade,
  occurred_at  timestamptz not null default now(),
  outcome      contact_outcome not null,
  note         text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- Eventos (confraternização etc.)
create table events (
  id               uuid primary key default gen_random_uuid(),
  congregation_id  uuid not null references congregations(id) on delete restrict,
  type             event_type not null default 'CONFRATERNIZACAO',
  title            text not null,
  date             date not null,
  status           event_status not null default 'PLANEJADO',
  notes            text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Confirmações de eventos
create table event_confirmations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  case_id      uuid not null references discipleship_cases(id) on delete cascade,
  confirmed    boolean not null default false,
  attended     boolean not null default false,
  class_shift  class_shift,
  notes        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint event_confirmations_event_case_unique unique (event_id, case_id)
);

-- Linha do tempo auditável
create table case_events (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references discipleship_cases(id) on delete cascade,
  type         case_event_type not null,
  description  text not null,
  metadata     jsonb,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- Pós-discipulado
create table post_discipleship (
  case_id              uuid primary key references discipleship_cases(id) on delete restrict,
  integration_status   integration_status not null default 'PENDENTE',
  baptism_status       baptism_status not null default 'NAO_BATIZADO',
  department_name      text,
  notes                text,
  updated_by           uuid references profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------

create index idx_disciples_congregation on disciples(congregation_id);
create index idx_disciples_name on disciples using gin(to_tsvector('portuguese', full_name));
create index idx_disciples_phone on disciples(congregation_id, phone) where phone is not null;

create index idx_cases_congregation_status on discipleship_cases(congregation_id, status);
create index idx_cases_disciple on discipleship_cases(disciple_id);
create index idx_cases_assigned on discipleship_cases(assigned_to) where assigned_to is not null;

create index idx_module_progress_case on case_module_progress(case_id);

create index idx_classes_congregation on classes(congregation_id);

create index idx_enrollments_disciple on class_enrollments(disciple_id);
create index idx_enrollments_class on class_enrollments(class_id);
create index idx_enrollments_active on class_enrollments(disciple_id) where active = true;

create index idx_lessons_class_date on lessons(class_id, date);

create index idx_attendance_lesson on attendance_items(lesson_id);
create index idx_attendance_disciple on attendance_items(disciple_id);

create index idx_contact_case on contact_attempts(case_id);
create index idx_case_events_case on case_events(case_id, created_at);

create index idx_events_congregation on events(congregation_id, date);
create index idx_event_confirmations_event on event_confirmations(event_id);

-- ---------------------------------------------------------------
-- FUNÇÃO: atualizar updated_at automaticamente
-- ---------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_congregations_updated_at before update on congregations
  for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_disciples_updated_at before update on disciples
  for each row execute function set_updated_at();
create trigger trg_cases_updated_at before update on discipleship_cases
  for each row execute function set_updated_at();
create trigger trg_module_templates_updated_at before update on module_templates
  for each row execute function set_updated_at();
create trigger trg_case_module_progress_updated_at before update on case_module_progress
  for each row execute function set_updated_at();
create trigger trg_classes_updated_at before update on classes
  for each row execute function set_updated_at();
create trigger trg_enrollments_updated_at before update on class_enrollments
  for each row execute function set_updated_at();
create trigger trg_lessons_updated_at before update on lessons
  for each row execute function set_updated_at();
create trigger trg_attendance_updated_at before update on attendance_items
  for each row execute function set_updated_at();
create trigger trg_events_updated_at before update on events
  for each row execute function set_updated_at();
create trigger trg_event_confirmations_updated_at before update on event_confirmations
  for each row execute function set_updated_at();
create trigger trg_post_discipleship_updated_at before update on post_discipleship
  for each row execute function set_updated_at();
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
-- =============================================================
-- 003_triggers_and_functions.sql
-- Triggers de negócio, RPCs e funções de cálculo
-- =============================================================

-- ---------------------------------------------------------------
-- Função: recalcular frequência de um case
-- ---------------------------------------------------------------
create or replace function recalculate_case_attendance(p_case_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_present  int := 0;
  v_justified int := 0;
  v_absent   int := 0;
  v_total    int := 0;
  v_rate     numeric(5,2) := 0;
  v_disciple_id uuid;
begin
  -- Busca o discipulando do case
  select disciple_id into v_disciple_id
  from discipleship_cases where id = p_case_id;

  -- Conta chamadas do discipulando em aulas de turmas onde está matriculado
  select
    count(*) filter (where ai.status = 'PRESENTE') as present,
    count(*) filter (where ai.status = 'JUSTIFICADA') as justified,
    count(*) filter (where ai.status = 'FALTA') as absent,
    count(*) as total
  into v_present, v_justified, v_absent, v_total
  from attendance_items ai
  join lessons l on l.id = ai.lesson_id
  join class_enrollments ce on ce.class_id = l.class_id
    and ce.disciple_id = v_disciple_id
  where ai.disciple_id = v_disciple_id;

  -- Frequência = presentes / total_com_status * 100
  -- Justificadas contam como registrada mas não como presença
  if v_total > 0 then
    v_rate := round((v_present::numeric / v_total) * 100, 2);
  end if;

  update discipleship_cases
  set
    total_lessons   = v_total,
    present_count   = v_present,
    justified_count = v_justified,
    absence_count   = v_absent,
    attendance_rate = v_rate,
    updated_at      = now()
  where id = p_case_id;
end;
$$;

-- ---------------------------------------------------------------
-- Trigger: recalcular frequência ao inserir/atualizar/deletar chamada
-- ---------------------------------------------------------------
create or replace function trg_recalculate_attendance_fn()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_disciple_id uuid;
begin
  -- Descobre o discipulando da chamada
  v_disciple_id := coalesce(new.disciple_id, old.disciple_id);

  -- Encontra o case ativo deste discipulando
  select id into v_case_id
  from discipleship_cases
  where disciple_id = v_disciple_id
    and status in ('EM_DISCIPULADO', 'PAUSADO', 'CONCLUIDO')
  order by created_at desc
  limit 1;

  if v_case_id is not null then
    perform recalculate_case_attendance(v_case_id);
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_attendance_recalculate
  after insert or update or delete on attendance_items
  for each row execute function trg_recalculate_attendance_fn();

-- ---------------------------------------------------------------
-- RPC: criar case + progresso de módulos (transação atômica)
-- ---------------------------------------------------------------
create or replace function create_discipleship_case(
  p_disciple_id    uuid,
  p_congregation_id uuid,
  p_assigned_to    uuid,
  p_welcomed_on    date,
  p_notes          text,
  p_created_by     uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_case_id         uuid;
  v_module_count    int;
  v_active_case     uuid;
begin
  -- Verificar se já existe case ativo
  select id into v_active_case
  from discipleship_cases
  where disciple_id = p_disciple_id
    and status in ('PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')
  limit 1;

  if v_active_case is not null then
    raise exception 'CASE_ALREADY_ACTIVE: discipulando já possui um case ativo';
  end if;

  -- Verificar se há módulos ativos na congregação
  select count(*) into v_module_count
  from module_templates
  where congregation_id = p_congregation_id and is_active = true;

  if v_module_count = 0 then
    raise exception 'NO_ACTIVE_MODULES: a congregação não possui módulos ativos. Cadastre os módulos antes de iniciar o acolhimento';
  end if;

  -- Criar o case
  insert into discipleship_cases (
    disciple_id, congregation_id, status, stage,
    assigned_to, welcomed_on, notes, created_by
  ) values (
    p_disciple_id, p_congregation_id, 'PENDENTE_MATRICULA', 'ACOLHIMENTO',
    p_assigned_to, p_welcomed_on, p_notes, p_created_by
  ) returning id into v_case_id;

  -- Criar progresso para cada módulo ativo
  insert into case_module_progress (case_id, module_template_id, status)
  select v_case_id, id, 'NAO_INICIADO'
  from module_templates
  where congregation_id = p_congregation_id and is_active = true;

  -- Registrar evento de acolhimento
  insert into case_events (case_id, type, description, created_by)
  values (v_case_id, 'ACOLHIMENTO', 'Acolhimento iniciado', p_created_by);

  return v_case_id;
end;
$$;

-- ---------------------------------------------------------------
-- RPC: matricular discipulando em turma
-- ---------------------------------------------------------------
create or replace function enroll_disciple(
  p_disciple_id   uuid,
  p_class_id      uuid,
  p_case_id       uuid,
  p_created_by    uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_enrollment_id   uuid;
  v_existing_active uuid;
begin
  -- Verificar se já tem matrícula ativa
  select id into v_existing_active
  from class_enrollments
  where disciple_id = p_disciple_id and active = true
  limit 1;

  if v_existing_active is not null then
    raise exception 'ALREADY_ENROLLED: discipulando já possui matrícula ativa em outra turma';
  end if;

  -- Criar matrícula
  insert into class_enrollments (class_id, disciple_id, active, created_by)
  values (p_class_id, p_disciple_id, true, p_created_by)
  returning id into v_enrollment_id;

  -- Promover case para EM_DISCIPULADO e etapa DISCIPULADO
  update discipleship_cases
  set
    status      = 'EM_DISCIPULADO',
    stage       = 'DISCIPULADO',
    updated_at  = now()
  where id = p_case_id
    and status = 'PENDENTE_MATRICULA';

  -- Registrar evento de matrícula
  insert into case_events (case_id, type, description, metadata, created_by)
  values (
    p_case_id,
    'MATRICULA',
    'Matriculado em turma',
    jsonb_build_object('enrollment_id', v_enrollment_id, 'class_id', p_class_id),
    p_created_by
  );

  return v_enrollment_id;
end;
$$;

-- ---------------------------------------------------------------
-- RPC: desmatricular discipulando
-- ---------------------------------------------------------------
create or replace function unenroll_disciple(
  p_disciple_id   uuid,
  p_case_id       uuid,
  p_created_by    uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update class_enrollments
  set active = false, updated_at = now()
  where disciple_id = p_disciple_id and active = true;

  -- Retorna case para PENDENTE_MATRICULA
  update discipleship_cases
  set
    status     = 'PENDENTE_MATRICULA',
    stage      = 'ACOLHIMENTO',
    updated_at = now()
  where id = p_case_id
    and status = 'EM_DISCIPULADO';

  insert into case_events (case_id, type, description, created_by)
  values (p_case_id, 'DESmatricula', 'Desmatriculado da turma', p_created_by);
end;
$$;

-- ---------------------------------------------------------------
-- RPC: concluir case (valida requisitos antes de concluir)
-- ---------------------------------------------------------------
create or replace function conclude_case(
  p_case_id    uuid,
  p_created_by uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_case          discipleship_cases%rowtype;
  v_pending_mods  int;
  v_has_attendance boolean;
begin
  select * into v_case from discipleship_cases where id = p_case_id;

  if not found then
    raise exception 'CASE_NOT_FOUND: case não encontrado';
  end if;

  if v_case.status = 'CONCLUIDO' then
    raise exception 'ALREADY_CONCLUDED: case já está concluído';
  end if;

  -- Verificar módulos pendentes
  select count(*) into v_pending_mods
  from case_module_progress
  where case_id = p_case_id and status != 'CONCLUIDO';

  if v_pending_mods > 0 then
    raise exception 'PENDING_MODULES: existem % módulo(s) não concluído(s)', v_pending_mods;
  end if;

  -- Verificar ao menos uma chamada
  if v_case.total_lessons = 0 then
    raise exception 'NO_ATTENDANCE: nenhuma chamada registrada para este discipulando';
  end if;

  -- Verificar frequência mínima
  if v_case.attendance_rate < 75 then
    raise exception 'LOW_ATTENDANCE: frequência %.2f%% abaixo do mínimo de 75%%', v_case.attendance_rate;
  end if;

  -- Concluir
  update discipleship_cases
  set status = 'CONCLUIDO', updated_at = now()
  where id = p_case_id;

  insert into case_events (case_id, type, description, metadata, created_by)
  values (
    p_case_id,
    'CONCLUSAO',
    'Discipulado concluído',
    jsonb_build_object(
      'attendance_rate', v_case.attendance_rate,
      'total_lessons',   v_case.total_lessons
    ),
    p_created_by
  );
end;
$$;

-- ---------------------------------------------------------------
-- RPC: iniciar pós-discipulado
-- ---------------------------------------------------------------
create or replace function start_post_discipleship(
  p_case_id    uuid,
  p_created_by uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  -- Só permitir em cases concluídos
  if not exists(
    select 1 from discipleship_cases
    where id = p_case_id and status = 'CONCLUIDO'
  ) then
    raise exception 'CASE_NOT_CONCLUDED: somente cases concluídos podem entrar em pós-discipulado';
  end if;

  -- Atualizar etapa para POS_DISCIPULADO
  update discipleship_cases
  set stage = 'POS_DISCIPULADO', updated_at = now()
  where id = p_case_id;

  -- Criar registro de pós-discipulado se não existir
  insert into post_discipleship (case_id, updated_by)
  values (p_case_id, p_created_by)
  on conflict (case_id) do nothing;

  insert into case_events (case_id, type, description, created_by)
  values (p_case_id, 'POS_DISCIPULADO', 'Acompanhamento pós-discipulado iniciado', p_created_by);
end;
$$;

-- ---------------------------------------------------------------
-- RPC: registrar chamada completa de uma aula (upsert em lote)
-- ---------------------------------------------------------------
create or replace function record_attendance(
  p_lesson_id  uuid,
  p_items      jsonb,  -- array de {disciple_id, status, note}
  p_marked_by  uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_item jsonb;
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into attendance_items (lesson_id, disciple_id, status, note, marked_by)
    values (
      p_lesson_id,
      (v_item->>'disciple_id')::uuid,
      (v_item->>'status')::attendance_status,
      v_item->>'note',
      p_marked_by
    )
    on conflict (lesson_id, disciple_id)
    do update set
      status    = excluded.status,
      note      = excluded.note,
      marked_by = excluded.marked_by,
      marked_at = now(),
      updated_at = now();
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- Trigger: criar perfil automaticamente ao criar usuário Auth
-- ---------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- Apenas cria se vier metadata com role
  if (new.raw_user_meta_data->>'role') is not null then
    insert into profiles (id, name, email, congregation_id, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', new.email),
      new.email,
      (new.raw_user_meta_data->>'congregation_id')::uuid,
      (new.raw_user_meta_data->>'role')::user_role
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------
-- Constraints adicionais
-- ---------------------------------------------------------------

-- Não permitir mais de um case ativo por discipulando
-- (verificado na RPC; constraint parcial como segunda defesa)
create unique index idx_cases_one_active_per_disciple
  on discipleship_cases (disciple_id)
  where status in ('PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO');

-- Não permitir mais de uma matrícula ativa por discipulando
create unique index idx_enrollments_one_active_per_disciple
  on class_enrollments (disciple_id)
  where active = true;

-- =============================================================
-- 004_congregation_theme.sql
-- Adiciona colunas de identidade visual por congregação
-- =============================================================

ALTER TABLE congregations
  ADD COLUMN IF NOT EXISTS logo_url      text,
  ADD COLUMN IF NOT EXISTS accent_color  text NOT NULL DEFAULT '#4F46E5',
  ADD COLUMN IF NOT EXISTS sidebar_color text NOT NULL DEFAULT '#0F172A';

-- Substituir a policy de update de congregations para incluir ADMIN_DISCIPULADO
DROP POLICY IF EXISTS "congregations_update" ON congregations;
CREATE POLICY "congregations_update" ON congregations FOR UPDATE
  USING (
    is_platform_admin()
    OR (
      id = auth_congregation_id()
      AND has_role(ARRAY['ADMIN_DISCIPULADO']::user_role[])
    )
  );

-- =============================================================
-- 005_integration_contact.sql
-- Adiciona rastreamento de confirmação de contato pelo departamento
-- =============================================================

ALTER TABLE post_discipleship
  ADD COLUMN IF NOT EXISTS department_contacted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS department_contacted_by  uuid references profiles(id);


-- =============================================================
-- 006_auto_module_progress.sql
-- Atualização automática do progresso de módulos pela chamada
-- =============================================================

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
  if (TG_OP = 'DELETE') then
    return old;
  end if;

  if new.status != 'PRESENTE' then
    return new;
  end if;

  select module_template_id
  into   v_module_template_id
  from   lessons
  where  id = new.lesson_id;

  if v_module_template_id is null then
    return new;
  end if;

  select id
  into   v_case_id
  from   discipleship_cases
  where  disciple_id = new.disciple_id
    and  status in ('EM_DISCIPULADO', 'PAUSADO', 'PENDENTE_MATRICULA')
  order by created_at desc
  limit 1;

  if v_case_id is null then
    return new;
  end if;

  update case_module_progress
  set
    status     = 'EM_ANDAMENTO',
    started_at = coalesce(started_at, now()),
    updated_at = now()
  where case_id            = v_case_id
    and module_template_id = v_module_template_id
    and status             = 'NAO_INICIADO';

  return new;
end;
$$;

drop trigger if exists trg_auto_module_progress on attendance_items;

create trigger trg_auto_module_progress
  after insert or update of status
  on attendance_items
  for each row
  execute function auto_advance_module_progress();


-- =============================================================
-- 007_storage_logos.sql
-- Bucket público para logos de congregações
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'congregation-logos',
  'congregation-logos',
  true,
  524288,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "logos_public_read"
  on storage.objects for select
  using (bucket_id = 'congregation-logos');

create policy "logos_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'congregation-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'ADMIN_PLATAFORMA'
        and is_active = true
    )
  );

create policy "logos_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'congregation-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'ADMIN_PLATAFORMA'
        and is_active = true
    )
  );

create policy "logos_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'congregation-logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'ADMIN_PLATAFORMA'
        and is_active = true
    )
  );

-- =============================================================
-- 008_worship_services.sql
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

-- =============================================================
-- 009_platform_settings.sql
-- Configurações globais da plataforma (não pertencem a uma congregação)
-- =============================================================

create table platform_settings (
  id                    smallint primary key default 1,
  login_verse_text      text not null default 'Ide, portanto, e fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo.',
  login_verse_reference text not null default 'Mateus 28:19',
  updated_at            timestamptz not null default now(),
  constraint platform_settings_singleton check (id = 1)
);

insert into platform_settings (id) values (1);

-- ---------------------------------------------------------------
-- PLATFORM_SETTINGS (RLS)
-- ---------------------------------------------------------------

alter table platform_settings enable row level security;

-- Leitura pública: a tela de login exibe o versículo antes de o usuário autenticar
create policy "platform_settings_select" on platform_settings for select
  using (true);

create policy "platform_settings_update" on platform_settings for update
  using (is_platform_admin());
