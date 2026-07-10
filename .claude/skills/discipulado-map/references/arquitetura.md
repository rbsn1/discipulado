# Arquitetura: auth, componentes, lógica de negócio, convenções

## Fluxo de autenticação

1. `src/proxy.ts` — middleware (convenção Next.js 16, export `proxy()` + `config.matcher`). Cria client Supabase ligado aos cookies da request/response, chama `supabase.auth.getUser()`:
   - não-autenticado fora de `/login` e `/` → redireciona para `/login`.
   - autenticado em `/login` → redireciona para `/painel`.
   - matcher exclui `_next/static`, `_next/image`, `favicon.ico`, extensões de imagem estáticas.
2. `src/lib/actions/auth.ts` (`'use server'`) — `login(email, password)`: `signInWithPassword` → `getCurrentProfile()` (`lib/repositories/profiles.ts`); se profile ausente ou `is_active === false`, faz sign-out e retorna erro em pt-BR; senão redireciona para `/painel`. `logout()` → `signOut()` + redirect `/login`.
3. `src/app/(dashboard)/layout.tsx` — segunda camada: carrega `getCurrentProfile()` de novo, redireciona para `/login` se null/inativo, carrega tema da congregação (logo, cores) e passa para `DashboardShell`.

Criação de usuário é admin-only (`createUserWithProfile` em `profiles.ts`, via `supabase.auth.admin.createUser` com o client de service-role) — não há self-signup, é ferramenta de convite.

## Estrutura de componentes (`src/components/`)

- **`ui/`** — primitivos genéricos (Radix UI + `class-variance-authority` + `tailwind-merge`): `alert`, `badge`, `button`, `card`, `dialog`, `input`, `select`, `textarea`. Sem lógica de domínio.
- **`layout/`**:
  - `sidebar.tsx` — nav principal, `'use client'`, recebe `profile`/`congregationName`/`theme`/`open`/`onClose`, filtra itens admin-only por papel, usa `deriveTheme()` para cores. Responsivo (overlay mobile + slide transform).
  - `dashboard-shell.tsx` — compõe `Sidebar` + header mobile (hamburger, logo, nome da congregação) + área de scroll; dono do estado `sidebarOpen`.
- **`features/`** — componentes de domínio, organizados por subpasta de feature (exceção, não a regra — a maior parte da interatividade vive direto no `client.tsx` de cada rota):
  - `features/admin/logo-uploader.tsx` — upload de logo da congregação.
  - `features/disciples/disciple-form.tsx` — form de criação/edição de `Disciple`.

## Lógica de negócio

Não há `services/` (pasta existe mas vazia). Dividida entre:

- **`src/lib/repositories/`** — ver [modelo-de-dados.md](modelo-de-dados.md).
- **`src/lib/actions/`** — Server Actions (`'use server'`): `auth.ts` (login/logout), `post-discipleship.ts` (`startPostDiscipleship`, `updatePostDiscipleship`, `confirmDepartmentContact`, `getPostDiscipleshipCases` — mistura writes diretos, RPC, e inserts manuais em `case_events` como audit log).
- **`src/lib/utils.ts`** — `cn()` (clsx+tailwind-merge), `formatDate`/`formatDateTime` (date-fns, `dd/MM/yyyy` pt-BR), mapas de label/cor por enum (`CASE_STATUS_LABEL`, `ROLE_LABEL`, `SHIFT_LABEL`, `ATTENDANCE_LABEL`, `MODULE_STATUS_LABEL`, ...), `getAttendanceCriticality(rate)` (≥75% ok / ≥50% warning / senão critical — regra testada e espelhada no banco), `toCSV`/`downloadCSV`.
- **`src/lib/theme.ts`** — `deriveTheme`, `THEME_PRESETS`: transforma `accentColor`/`sidebarColor` da congregação em paleta completa (gradientes, cores de texto com contraste garantido via opacidade). Funciona em Server e Client Components.

Sem pasta de custom hooks — estado é `useState`/`useActionState` local por componente.

## Convenções

- **Nomenclatura de arquivo**: kebab-case (`disciple-form.tsx`, `logo-uploader.tsx`, `dashboard-shell.tsx`); pastas de rota usam termos de domínio em português alinhados com a UI.
- **Padrão de rota de lista**: `page.tsx` (server, busca dados + gate de papel) + `client.tsx` (`'use client'`, export nomeado tipo `CultosClient`).
- **Idioma**: UI, comentários e boa parte dos identificadores em pt-BR; datas via `date-fns` + `ptBR`.
- **TypeScript**: sem geração automática de tipos Supabase; interfaces mantidas manualmente em `src/types/index.ts`, com `as X` após `.select()`. Mapas `Record<Enum, string>` centralizados em vez de switch espalhado.
- **Estilo**: Tailwind CSS v4 + CVA em `ui/`, `cn()` usado por toda parte; tema por congregação calculado em runtime via `lib/theme.ts` (não CSS vars/Tailwind config).
- **Mutação de dados**: dois padrões coexistem — Server Actions (auth, pos-discipulado) e API Route Handlers em `src/app/api/` (quase tudo mais, chamados via `fetch` no client). Route handlers seguem sempre: `getCurrentProfile()` → 401 se ausente → checagem de papel → delega pro repository.
- **Multi-tenancy**: `congregation_id` reforçado duas vezes — RLS no Postgres e checagem na aplicação (`profile.congregation_id` usado para escopar chamadas de repository).
