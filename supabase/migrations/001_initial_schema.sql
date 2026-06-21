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
