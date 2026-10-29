# Modelo de dados

## Clients Supabase (`src/lib/supabase/`)

- `client.ts` — browser client (`createBrowserClient`), chave anon.
- `server.ts` — server client (`createServerClient`) para Server Components/Actions/Route Handlers, lê/escreve cookies via `next/headers` `cookies()` (try/catch no `setAll` porque Server Components não podem setar cookies).
- `admin.ts` — client com `SUPABASE_SERVICE_ROLE_KEY` (`createAdminClient`), usado para operações privilegiadas que precisam ignorar RLS (criar auth user, upload em storage). Uso sempre gated por checagem de papel na aplicação antes de chamar.

## Tipos

Sem `database.types.ts` gerado — tipos são escritos à mão em `src/types/index.ts`: unions tipo enum (`UserRole`, `CaseStatus`, `CaseStage`, `AttendanceStatus`, ...), interfaces de entidade espelhando tabelas (`Congregation`, `Profile`, `Disciple`, `DiscipleshipCase`, `WorshipService`, `Class`, `Lesson`, `AttendanceItem`, `Event`, ...), tipos `WithRelations` compostos para queries com join, e DTOs de formulário (`CreateDiscipleInput`, `StartCaseInput`, ...).

**Ao mudar uma tabela, atualize `src/types/index.ts` manualmente** — não há geração automática.

## RLS e migrations (`supabase/migrations/`)

Ordem: `000_run_all.sql` (runner agregado) → `001_initial_schema.sql` → `002_rls_policies.sql` → `003_triggers_and_functions.sql` → `004_congregation_theme.sql` → `005_integration_contact.sql` → `006_auto_module_progress.sql` → `007_storage_logos.sql` → `008_worship_services.sql` → `009_platform_settings.sql` → `010_performance_indexes.sql` → `011_dashboard_stats_rpc.sql` → `012_report_stats_rpc.sql` → `013_record_attendance_batch.sql` → `014_fix_profile_privilege_escalation.sql` → `015_congregation_billing.sql` → `016_contact_outcomes_fbv.sql` → `017_class_shifts_catalog.sql` → `018_departments_catalog.sql` → `019_report_stats_department_id.sql` → `020_em_acolhimento_status.sql` → `021_em_acolhimento_logic.sql` → `022_em_acolhimento_revert.sql` → `023_matricula_events_turma_name.sql` → `024_attendance_makeup.sql` → `025_makeup_lessons.sql` → `026`–`028_security_hardening*.sql` → `029_password_reset_requests.sql` → `030_must_change_password.sql` → `031_report_improvements.sql` → `032_drop_old_report_stats_overload.sql` → `033_report_stats_revoke_anon.sql` → `034_report_stats_revoke_public.sql` → `035_late_enrollment_makeup.sql` → `seed.sql`. (Lista até 021 tinha ficado desatualizada — 022 em diante não foram documentadas linha a linha aqui além do que segue, só a mais recente.)

**024/025**: fluxo de reposição de aula. `attendance_items.made_up` marca uma falta/justificada como "reposta". `lessons.makeup_for_lesson_id` liga uma aula de reposição à aula original perdida. `resolve_makeup_attendance(lesson_id, disciple_ids[], marked_by)` converte a falta original direto pra `PRESENTE` + `made_up=true` quando o aluno comparece na reposição — não cria registro novo, só resolve o que já existia. UI: aba "Reposições" em `turmas/[id]/client.tsx`, agrupada por aula original.

**035**: aluno matriculado depois que a turma já teve aulas não tinha nenhum sinal de que "devia" aquelas aulas — `enroll_disciple` agora insere, pra cada aula anterior à matrícula (exceto aulas de reposição), uma linha `attendance_items` sintética (`status='FALTA'`, `pre_enrollment=true`), reaproveitando o fluxo de reposição existente (024/025) em vez de um caminho novo. `recalculate_case_attendance` exclui essas linhas do cálculo de frequência **enquanto não repostas** (`pre_enrollment and not made_up`); assim que repostas (`made_up=true`, vira `PRESENTE`), contam normalmente. No app, `getLessonSummary` (`turmas/[id]/client.tsx`) ignora `pre_enrollment` no resumo da aula original, e o roster de cada aula (pra completude e pra marcar chamada) é filtrado por `class_enrollments.enrolled_at <= aula.date` (`rosterAsOf`) em vez de "matriculados hoje" — sem isso, uma aula antiga completa virava "parcial" assim que alguém novo entrava na turma.

**017**: catálogo `class_shifts` (congregação → turnos, mesmo padrão de `worship_services`). Substituiu o enum fixo `class_shift` como fonte de verdade de `classes.shift_id` e `event_confirmations.class_shift_id` (ambos FK nullable pra `class_shifts`; nulo = "não informado", que não é mais um valor do catálogo). As colunas antigas `classes.shift`/`event_confirmations.class_shift` (enum `class_shift`) continuam no banco só como histórico congelado — o app não lê nem escreve mais nelas.

**018**: catálogo `departments` (congregação → departamentos), mesmo padrão. Substituiu o campo de texto livre `post_discipleship.department_name` por `post_discipleship.department_id` (FK nullable pra `departments`). Coluna antiga congelada, mesma lógica.

**019**: `get_report_stats()` (ver RPCs abaixo) tinha a lógica dos buckets de integração espelhando `department_name` diretamente — teve que ser atualizada junto com a 018 pra checar `department_id`, senão os contadores de `/relatorios` ficariam presos em "sem departamento" pra sempre. **Lição**: ao aposentar uma coluna que uma RPC já lê diretamente (grep por `nome_da_coluna` em `supabase/migrations/*.sql` antes de migrar), a RPC precisa de `create or replace function` na mesma leva.

**020/021**: novo `case_status` = `EM_ACOLHIMENTO`, antes de `PENDENTE_MATRICULA` no funil. `create_discipleship_case` agora nasce o case em `EM_ACOLHIMENTO` (não mais direto em `PENDENTE_MATRICULA`). Um trigger novo em `event_confirmations` (`trg_auto_advance_case_after_fbv`, espelhando o padrão de `006_auto_module_progress.sql`) promove `EM_ACOLHIMENTO → PENDENTE_MATRICULA` sozinho quando `attended` vira `true` numa Festa de Boas Vindas — nunca regride. Todo lugar que checava `status in ('PENDENTE_MATRICULA', 'EM_DISCIPULADO', 'PAUSADO')` como "case ativo" precisou incluir `EM_ACOLHIMENTO` também: o índice único `idx_cases_one_active_per_disciple`, `get_dashboard_stats()` (`sem_responsavel`/`sem_contato_recente`), e no app `acolhimento/page.tsx`, `confraternizacao/[id]/page.tsx`. **`pendente_matricula`/`sem_matricula` no dashboard continuam só com o status literal, de propósito** — quem está em `EM_ACOLHIMENTO` ainda não pode ser matriculado. Cases já existentes não foram migrados retroativamente (quem já estava em `PENDENTE_MATRICULA` continua lá).

Isolamento multi-tenant por `congregation_id` em quase toda tabela. Funções helper usadas nas policies: `is_platform_admin()`, `auth_congregation_id()`, `has_role(...)`.

**Ao adicionar tabela nova**: criar migration própria, adicionar ao `000_run_all.sql`, escrever policies usando os helpers acima seguindo o padrão de `008_worship_services.sql`.

## Tabelas em uso (via `.from(...)`)

`attendance_items`, `case_events`, `case_module_progress`, `class_enrollments`, `class_shifts`, `classes`, `congregations`, `contact_attempts`, `departments`, `disciples`, `discipleship_cases`, `event_confirmations`, `events`, `lessons`, `module_templates`, `post_discipleship`, `profiles`, `worship_services`.

## RPCs (funções Postgres, via `supabase.rpc(...)`)

`conclude_case`, `create_discipleship_case`, `enroll_disciple`, `record_attendance`, `recalculate_case_attendance` (trigger, não chamada direto pelo app), `resolve_makeup_attendance`, `start_post_discipleship`, `unenroll_disciple`.

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
