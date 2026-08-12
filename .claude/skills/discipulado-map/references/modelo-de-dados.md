# Modelo de dados

## Clients Supabase (`src/lib/supabase/`)

- `client.ts` — browser client (`createBrowserClient`), chave anon.
- `server.ts` — server client (`createServerClient`) para Server Components/Actions/Route Handlers, lê/escreve cookies via `next/headers` `cookies()` (try/catch no `setAll` porque Server Components não podem setar cookies).
- `admin.ts` — client com `SUPABASE_SERVICE_ROLE_KEY` (`createAdminClient`), usado para operações privilegiadas que precisam ignorar RLS (criar auth user, upload em storage). Uso sempre gated por checagem de papel na aplicação antes de chamar.

## Tipos

Sem `database.types.ts` gerado — tipos são escritos à mão em `src/types/index.ts`: unions tipo enum (`UserRole`, `CaseStatus`, `CaseStage`, `AttendanceStatus`, ...), interfaces de entidade espelhando tabelas (`Congregation`, `Profile`, `Disciple`, `DiscipleshipCase`, `WorshipService`, `Class`, `Lesson`, `AttendanceItem`, `Event`, ...), tipos `WithRelations` compostos para queries com join, e DTOs de formulário (`CreateDiscipleInput`, `StartCaseInput`, ...).

**Ao mudar uma tabela, atualize `src/types/index.ts` manualmente** — não há geração automática.

## RLS e migrations (`supabase/migrations/`)

Ordem: `000_run_all.sql` (runner agregado) → `001_initial_schema.sql` → `002_rls_policies.sql` → `003_triggers_and_functions.sql` → `004_congregation_theme.sql` → `005_integration_contact.sql` → `006_auto_module_progress.sql` → `007_storage_logos.sql` → `008_worship_services.sql` → `009_platform_settings.sql` → `010_performance_indexes.sql` → `011_dashboard_stats_rpc.sql` → `012_report_stats_rpc.sql` → `013_record_attendance_batch.sql` → `014_fix_profile_privilege_escalation.sql` → `015_congregation_billing.sql` → `016_contact_outcomes_fbv.sql` → `017_class_shifts_catalog.sql` → `018_departments_catalog.sql` → `019_report_stats_department_id.sql` → `seed.sql`.

**017**: catálogo `class_shifts` (congregação → turnos, mesmo padrão de `worship_services`). Substituiu o enum fixo `class_shift` como fonte de verdade de `classes.shift_id` e `event_confirmations.class_shift_id` (ambos FK nullable pra `class_shifts`; nulo = "não informado", que não é mais um valor do catálogo). As colunas antigas `classes.shift`/`event_confirmations.class_shift` (enum `class_shift`) continuam no banco só como histórico congelado — o app não lê nem escreve mais nelas.

**018**: catálogo `departments` (congregação → departamentos), mesmo padrão. Substituiu o campo de texto livre `post_discipleship.department_name` por `post_discipleship.department_id` (FK nullable pra `departments`). Coluna antiga congelada, mesma lógica.

**019**: `get_report_stats()` (ver RPCs abaixo) tinha a lógica dos buckets de integração espelhando `department_name` diretamente — teve que ser atualizada junto com a 018 pra checar `department_id`, senão os contadores de `/relatorios` ficariam presos em "sem departamento" pra sempre. **Lição**: ao aposentar uma coluna que uma RPC já lê diretamente (grep por `nome_da_coluna` em `supabase/migrations/*.sql` antes de migrar), a RPC precisa de `create or replace function` na mesma leva.

Isolamento multi-tenant por `congregation_id` em quase toda tabela. Funções helper usadas nas policies: `is_platform_admin()`, `auth_congregation_id()`, `has_role(...)`.

**Ao adicionar tabela nova**: criar migration própria, adicionar ao `000_run_all.sql`, escrever policies usando os helpers acima seguindo o padrão de `008_worship_services.sql`.

## Tabelas em uso (via `.from(...)`)

`attendance_items`, `case_events`, `case_module_progress`, `class_enrollments`, `class_shifts`, `classes`, `congregations`, `contact_attempts`, `departments`, `disciples`, `discipleship_cases`, `event_confirmations`, `events`, `lessons`, `module_templates`, `post_discipleship`, `profiles`, `worship_services`.

## RPCs (funções Postgres, via `supabase.rpc(...)`)

`conclude_case`, `create_discipleship_case`, `enroll_disciple`, `record_attendance`, `start_post_discipleship`, `unenroll_disciple`.

Regras de negócio que precisam de atomicidade/transação ficam em funções/triggers Postgres (`003_triggers_and_functions.sql`, `006_auto_module_progress.sql`), não em JS — a camada de app é majoritariamente CRUD/orquestração fina sobre regras impostas no banco.

## Camada de acesso (`src/lib/repositories/`)

Um arquivo por agregado, funções async simples que envolvem queries Supabase (lançam erro em `error` na maioria dos casos):

- `profiles.ts` — `getCurrentProfile`, `getProfilesByCongregation`, `getAllProfiles`, `updateProfile`, `createUserWithProfile`.
- `disciples.ts` — CRUD/listagem de discípulos.
- `cases.ts` (299 linhas, maior arquivo) — queries de case + `getDashboardStats` para `/painel`.
- `classes.ts` — turmas, matrículas, aulas.
- `modules.ts` — templates de módulo.
- `events.ts` — eventos de confraternização + confirmações.
- `worship-services.ts` — catálogo de cultos.
- `class-shifts.ts` — catálogo de turnos (usado por `classes.shift_id` e `event_confirmations.class_shift_id`).
- `departments.ts` — catálogo de departamentos (usado por `post_discipleship.department_id`).
- `reports.ts` — shaping de dados para `/relatorios`.

Toda leitura/escrita no Supabase deve passar por um repository — evite `.from()`/`.rpc()` direto em componentes (exceções pontuais só em `layout.tsx`/arquivos de actions).
