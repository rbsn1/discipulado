-- =============================================================
-- 010_performance_indexes.sql
-- Índices faltantes em colunas de FK/RLS, busca por nome/telefone,
-- e remoção de índices redundantes (duplicam constraints UNIQUE
-- ou o início de uma PK composta já existente).
-- =============================================================

-- ---------------------------------------------------------------
-- Índices faltantes: colunas usadas em RLS ou em queries reais
-- da aplicação, sem nenhuma cobertura hoje
-- ---------------------------------------------------------------

-- Tabelas sem NENHUM índice até agora, atingidas em toda RLS check
create index idx_module_templates_congregation on module_templates(congregation_id);
create index idx_worship_services_congregation on worship_services(congregation_id);

-- FK sem índice + query confirmada (getCaseConfraternizacaoInfo) + ON DELETE CASCADE
create index idx_event_confirmations_case on event_confirmations(case_id);

-- FK sem índice, usada em RLS (profiles_select/profiles_update) e em getProfilesByCongregation
create index idx_profiles_congregation on profiles(congregation_id);

-- FK sem índice, ON DELETE RESTRICT (custo ao apagar um culto)
create index idx_disciples_worship_service on disciples(worship_service_id);

-- FKs sem índice, custo ao apagar module_templates (ON DELETE RESTRICT)
create index idx_case_module_progress_template on case_module_progress(module_template_id);
create index idx_lessons_module_template on lessons(module_template_id);

-- ---------------------------------------------------------------
-- Busca por nome/telefone: getDisciples() usa ILIKE '%termo%',
-- que nenhum índice atual serve (idx_disciples_name é GIN tsvector,
-- só serve consultas @@; idx_disciples_phone é btree comum,
-- não serve wildcard à esquerda)
-- ---------------------------------------------------------------

create extension if not exists pg_trgm;

create index idx_disciples_name_trgm on disciples using gin (full_name gin_trgm_ops);
create index idx_disciples_phone_trgm on disciples using gin (phone gin_trgm_ops);

-- ---------------------------------------------------------------
-- Índices redundantes: cada um duplica o início de uma constraint
-- UNIQUE (ou PK composta) que já cobre a mesma coluna — custo de
-- escrita sem ganho de leitura. attendance_items é a tabela com
-- mais escrita do sistema, então isso importa especialmente ali.
-- ---------------------------------------------------------------

-- Redundante: disciples_phone_congregation_unique(congregation_id, phone) já cobre
drop index if exists idx_disciples_phone;

-- Redundante: PK composta (case_id, module_template_id) já cobre case_id sozinho
drop index if exists idx_module_progress_case;

-- Redundante: attendance_lesson_disciple_unique(lesson_id, disciple_id) já cobre
drop index if exists idx_attendance_lesson;

-- Redundante: idx_enrollments_one_active_per_disciple tem a mesma definição
-- (disciple_id) where active = true, só que UNIQUE
drop index if exists idx_enrollments_active;
