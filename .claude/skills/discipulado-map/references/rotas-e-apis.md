# Rotas e APIs

Root: `src/app`. Route groups: `(auth)` (pública) e `(dashboard)` (autenticada).

## Públicas

- `src/app/page.tsx` — `/`, apenas `redirect('/painel')`.
- `src/app/(auth)/login/page.tsx` — login, client component com `useActionState` + server action `login` (`src/lib/actions/auth.ts`).
- `src/app/layout.tsx` — layout raiz HTML, metadata pt-BR.

## Autenticadas (`src/app/(dashboard)/`, envolvidas por `layout.tsx` → `DashboardShell`)

| Rota | Arquivo(s) | Descrição |
|---|---|---|
| `layout.tsx` | — | carrega profile + tema da congregação, redireciona para `/login` se profile ausente/inativo |
| `/painel` | `painel/page.tsx` | dashboard home, `getDashboardStats` (`lib/repositories/cases.ts`) |
| `/discipulandos` | `discipulandos/page.tsx` + `client.tsx` | lista/gestão de discípulos (CRM) |
| `/discipulandos/[id]` | `discipulandos/[id]/page.tsx` + `client.tsx` | detalhe de um discípulo/case |
| `/acolhimento` | `acolhimento/page.tsx` + `client.tsx` | board "Jornada" (kanban de acolhimento) |
| `/confraternizacao` | `confraternizacao/page.tsx` + `client.tsx` | lista de eventos "Boas Vindas" |
| `/confraternizacao/[id]` | `confraternizacao/[id]/page.tsx` + `client.tsx` | detalhe de evento (presença/confirmações) |
| `/turmas` | `turmas/page.tsx` + `client.tsx` | lista de turmas |
| `/turmas/[id]` | `turmas/[id]/page.tsx` + `client.tsx` | detalhe de turma (aulas, matrícula, presença) |
| `/pos-discipulado` | `pos-discipulado/page.tsx` + `client.tsx` | integração pós-discipulado (`lib/actions/post-discipleship.ts`) |
| `/relatorios` | `relatorios/page.tsx` + `client.tsx` | relatórios/export CSV |
| `/admin` | `admin/page.tsx` | hub admin |
| `/admin/congregacoes` | `admin/congregacoes/page.tsx` + `client.tsx` | CRUD congregação, tema, logo |
| `/admin/usuarios` | `admin/usuarios/page.tsx` + `client.tsx` | gestão de usuários/profiles (papéis, ativação) |
| `/admin/modulos` | `admin/modulos/page.tsx` + `client.tsx` | CRUD de templates de módulo de discipulado |
| `/admin/cultos` | `admin/cultos/page.tsx` + `client.tsx` | CRUD do catálogo de cultos (feature mais recente) |

Nenhuma dessas sub-rotas de `/admin` aparece no nav principal do sidebar — só são alcançadas via `/admin`.

## API route handlers (`src/app/api/**/route.ts`)

REST-style, chamadas via `fetch` no client em vez de Server Actions. Padrão comum: `getCurrentProfile()` → 401 se ausente → checagem de papel → delega para repository.

- `admin/congregations/route.ts`, `[id]/route.ts`, `[id]/logo/route.ts` (POST/DELETE upload de logo no Supabase Storage, só `ADMIN_PLATAFORMA`)
- `admin/users/route.ts`, `[id]/route.ts`
- `cases/route.ts`, `[id]/assign|conclude|contacts|modules|pause|resume/route.ts` — ciclo de vida do case de discipulado
- `classes/route.ts`, `[id]/route.ts`, `[id]/lessons/route.ts`, `enroll/route.ts`
- `disciples/route.ts`, `[id]/route.ts`
- `events/route.ts`, `[id]/route.ts`, `[id]/status/route.ts`, `[id]/confirmations/route.ts`
- `lessons/[id]/attendance/route.ts`
- `modules/route.ts`, `[id]/route.ts`
- `worship-services/route.ts` (GET/POST, papel `ADMIN_DISCIPULADO`/`ADMIN_PLATAFORMA`), `[id]/route.ts` (PATCH)

## Papéis (UserRole em `src/types/index.ts`)

`ADMIN_PLATAFORMA`, `ADMIN_DISCIPULADO`, `DISCIPULADOR`, `SECRETARIA_DISCIPULADO`, `SM_DISCIPULADO`. Itens admin-only do sidebar (`Relatórios`, `Administração`) são filtrados por papel em `src/components/layout/sidebar.tsx`.
