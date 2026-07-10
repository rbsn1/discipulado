# Fluxos de referência: impacto cruzado e receitas

## Arquivos de alto impacto ("blast radius")

Estes arquivos são usados por múltiplas telas/fluxos. Antes de editar, faça grep por todos os usos — uma mudança aqui pode quebrar algo que não estava no seu radar:

| Arquivo | Por que é de alto impacto |
|---|---|
| `src/proxy.ts` | middleware — controla acesso a toda rota autenticada/pública |
| `src/lib/repositories/profiles.ts` (`getCurrentProfile`) | chamado no layout do dashboard e em quase todo route handler para auth+papel |
| `src/app/(dashboard)/layout.tsx` | segunda camada de auth + carrega tema para todas as páginas do dashboard |
| `src/lib/theme.ts` | deriva a paleta de cores usada no sidebar e no shell inteiro |
| `src/lib/utils.ts` | mapas de label/cor por enum (`*_LABEL`) e `getAttendanceCriticality` usados em várias telas/relatórios |
| `src/types/index.ts` | interfaces centrais; mudar um campo aqui sem migration correspondente quebra o build ou dessincroniza do banco |
| `src/components/layout/sidebar.tsx` | nav global — filtro de papel afeta visibilidade de todas as seções admin |
| `supabase/migrations/003_triggers_and_functions.sql`, `006_auto_module_progress.sql` | regras de negócio (conclusão de case, cálculo de presença) espelhadas em `lib/utils.ts` e testadas em `business-rules.test.ts` — mudar uma exige mudar a outra |

## Receita padrão: novo recurso CRUD tipo admin (catálogo)

Baseado no padrão real usado para adicionar "cultos" (commit `80a8488`, ver [modelo-de-dados.md](modelo-de-dados.md) para as tabelas). Ao pedir algo como "adicionar um catálogo de X gerenciável pelo admin", os pontos a tocar são, nesta ordem:

1. **Migration** — nova tabela em `supabase/migrations/0XX_<nome>.sql`, com RLS usando os helpers padrão (`is_platform_admin()`, `auth_congregation_id()`, `has_role(...)`). Adicionar ao `000_run_all.sql`.
2. **Tipos** — nova interface em `src/types/index.ts`; se a tabela se relaciona com uma entidade existente (ex.: `disciples`), adicionar o campo FK opcional e o join expandido no tipo `WithRelations`.
3. **Repository** — `src/lib/repositories/<nome>.ts` com CRUD (padrão: soft-delete via `is_active: false`, não DELETE físico).
4. **API routes** — `src/app/api/<nome>/route.ts` (GET/POST) + `[id]/route.ts` (PATCH), com o padrão `getCurrentProfile()` → 401 → checagem de papel → repository.
5. **Página admin** — `src/app/(dashboard)/admin/<nome>/page.tsx` + `client.tsx` (dialog de criar/editar, toggle ativar/desativar, empty state).
6. **Link no hub admin** — adicionar tile/link em `src/app/(dashboard)/admin/page.tsx` (não precisa entrar no sidebar principal — sub-recursos de admin só são alcançados via `/admin`).
7. **Integração no formulário consumidor**, se aplicável — ex. `disciple-form.tsx` ganhou um `<select>` para escolher o culto.

## Gaps conhecidos do stack (não repetir sem confirmar com o usuário)

- `react-hook-form` + `@hookform/resolvers` + `zod` estão no `package.json` mas **não são usados em lugar nenhum** — todo formulário usa `useState` + validação manual, ou `useActionState` com Server Action. Introduzir RHF num form novo seria inconsistente com o resto do código; avise antes de fazer isso.
- Não há `database.types.ts` gerado — tipos em `src/types/index.ts` podem dessincronizar do schema real se a migration não for espelhada lá.

## Testes

- `src/__tests__/business-rules.test.ts` — unitários puros, sem banco: `getAttendanceCriticality`, `calculateAttendanceRate` (espelha coluna computada do banco), `canConcludeCase` (módulos pendentes / sem aulas / presença < 75%), `toCSV`. Rodar: `npm test`.
- `src/__tests__/rls-isolation.test.ts` — integração contra Supabase real, prova isolamento entre congregações (`admin@central.dev` vs `admin@norte.dev`). Só roda com env vars setadas (`describe.skipIf(!SUPABASE_URL)`); rodar via `npm run test:integration`. **Nunca rodar contra produção** — depende dos fixtures de `seed.sql`.

Ao mudar uma regra de negócio espelhada (presença, elegibilidade de conclusão), atualizar a versão em `lib/utils.ts`/testes E a função/trigger Postgres correspondente.
