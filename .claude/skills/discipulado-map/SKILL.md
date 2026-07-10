---
name: discipulado-map
description: Mapa arquitetural do app "discipulado" (Next.js 16 + Supabase, gestão de discipulado de igreja). Use SEMPRE antes de adicionar uma feature, corrigir um bug, ou alterar qualquer código neste repositório — evita reexplorar o codebase do zero e mostra quais fluxos/arquivos compartilhados podem ser afetados por uma mudança. Gatilhos: "adicionar feature", "criar tela", "corrigir bug", "implementar", "alterar", "novo campo", "nova rota", ou qualquer pedido de mudança de código neste projeto.
---

# Mapa do projeto discipulado

App Next.js 16 (App Router) + Supabase para gestão de discipulado de igreja. UI e domínio em pt-BR. Multi-tenant por `congregation_id`.

## Como usar esta skill

1. Antes de tocar em código, leia o(s) arquivo(s) de referência relevantes abaixo em vez de explorar o repo manualmente.
2. Depois de entender o ponto de mudança, confira a seção **Arquivos de alto impacto** em [fluxos-de-referencia.md](references/fluxos-de-referencia.md) — se a mudança toca um desses arquivos, verifique todos os usos antes de editar (grep), pois afetam múltiplas telas.
3. Se a mudança for "adicionar um recurso CRUD novo tipo admin" (ex.: outro catálogo como `cultos`), siga a receita em [fluxos-de-referencia.md](references/fluxos-de-referencia.md) — é o padrão já estabelecido no repo.
4. Depois de implementar, atualize o arquivo de referência correspondente (rotas novas → `rotas-e-apis.md`; tabela/coluna nova → `modelo-de-dados.md`) para a skill continuar precisa.

## Referências

- [rotas-e-apis.md](references/rotas-e-apis.md) — todas as páginas (`src/app`) e API route handlers (`src/app/api`), públicas vs autenticadas, papéis exigidos.
- [modelo-de-dados.md](references/modelo-de-dados.md) — clients Supabase, tabelas, RPCs, migrations, RLS, onde ficam os tipos TypeScript.
- [arquitetura.md](references/arquitetura.md) — fluxo de auth/middleware, estrutura de componentes, camada de lógica de negócio (repositories/actions), convenções de código.
- [fluxos-de-referencia.md](references/fluxos-de-referencia.md) — arquivos de alto impacto (blast radius), receita padrão para nova feature CRUD, gaps conhecidos do stack.

## Regras críticas (não quebrar)

- **Multi-tenancy**: toda query deve respeitar `congregation_id`. Isso é reforçado em dois níveis — RLS no Postgres (`supabase/migrations/002_rls_policies.sql` e seguintes) e checagem na aplicação (repositories usam `profile.congregation_id`). Uma mudança que ignore um dos dois níveis é bug de segurança.
- **Auth em duas camadas**: `src/proxy.ts` (middleware) redireciona não-autenticados, e `src/app/(dashboard)/layout.tsx` faz uma segunda checagem (`getCurrentProfile()` + `is_active`). Não remova nenhuma das duas.
- **Padrão página**: rotas de lista seguem sempre `page.tsx` (server, busca dados + checagem de papel) + `client.tsx` (`'use client'`, interatividade). Mantenha esse par ao criar rota nova.
- **Sem RHF/Zod na prática**: apesar de estarem no `package.json`, `react-hook-form` e `zod` não são usados em lugar nenhum — formulários usam `useState` + validação manual, ou `useActionState` com Server Actions. Não introduza um formulário novo com RHF sem checar com o usuário primeiro (mudaria o padrão do projeto).
- **Regras de negócio duplicadas de propósito**: `getAttendanceCriticality`, `calculateAttendanceRate`, `canConcludeCase` em `src/lib/utils.ts`/testes espelham lógica que também existe no Postgres (triggers/RPCs). Se mudar a regra, mude nos dois lugares.
