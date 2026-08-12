---
name: discipulado-improvements
description: Use quando o usuário quiser LEVANTAR ideias de melhoria pro app "discipulado" a partir do estado real do código — não pra decidir se uma ideia específica vale a pena (isso é a skill discipulado-roadmap) nem pra implementar algo já decidido (isso é discipulado-map). Gera uma lista curta de candidatos ancorados em dores concretas, não uma wishlist genérica de SaaS. Gatilhos: "pensar em melhorias", "o que podemos melhorar", "brainstorm de melhorias", "ideias pro app", "o que falta no sistema", "onde dá pra evoluir".
---

# Levantamento de melhorias — discipulado

Este app é usado por líderes de igreja, muitos pouco técnicos, num contexto de voluntariado (sem equipe de TI dedicada, sem orçamento de manutenção contínua). Uma "melhoria" boa aqui resolve uma dor concreta de quem usa hoje — não é a feature que apareceria numa lista genérica de SaaS.

## Quando usar (e quando não)

- **Use** esta skill pra GERAR uma lista de candidatos a melhoria, varrendo o app como ele é hoje.
- **Não** use pra decidir se uma ideia específica vale a pena, pesar segurança/simplicidade/reversibilidade — isso é a skill **discipulado-roadmap**. Use-a depois, uma vez que o usuário escolheu um item da lista.
- **Não** use pra implementar algo já decidido — isso é a skill **discipulado-map**, que também deve ser lida antes de começar (evita sugerir algo que já existe).

## Onde procurar dores reais

Não invente uma lista a partir de conhecimento genérico de produto. Cave no que já existe:

1. **Comentários no código** — grep por `TODO`, `FIXME`, `HACK`, `XXX`. Sinal direto de dívida técnica já reconhecida por quem escreveu.
2. **Gaps já documentados** — seção "Gaps conhecidos do stack" em `discipulado-map/references/fluxos-de-referencia.md` (ex.: RHF/zod no `package.json` mas não usados, sem `database.types.ts` gerado).
3. **Regras de negócio duplicadas de propósito** (`lib/utils.ts` espelhando função/trigger Postgres, ver `discipulado-map`) — cada duplicação é um ponto de risco de dessincronia. Vale reduzir?
4. **Falta de observability/alerting** (mencionado no `discipulado-roadmap`) — quais RPCs, triggers ou automações falham hoje sem avisar ninguém?
5. **Fluxo por papel de usuário** — percorra o que `ADMIN_PLATAFORMA`, `ADMIN_DISCIPULADO`, `DISCIPULADOR`/Acolhedor, `SECRETARIA_DISCIPULADO` e `SM_DISCIPULADO` realmente fazem (ver rotas em `discipulado-map/references/rotas-e-apis.md`). Onde a tela pede passo manual demais, ou não dá visibilidade do que a pessoa precisa decidir?
6. **Padrão "lista que só cresce"** — telas que já resolveram isso escondendo itens concluídos/realizados por padrão (eventos de Boas-vindas, aulas de turma) existem; outras listas do app (discipulandos, cases, etc.) têm o mesmo problema sem solução ainda?
7. **Enum fixo que já devia ser catálogo admin** — o padrão catálogo-editável-pelo-admin (`cultos`, `turnos`) já existe; olhe `src/types/index.ts` por outros `type X = 'A' | 'B' | ...` que representam algo que uma congregação diferente razoavelmente customizaria.
8. **Dor repetida nas conversas com o usuário** — se a mesma pergunta ou reclamação operacional já apareceu mais de uma vez (histórico da sessão, memórias salvas), é sinal de dor real e recorrente, não hipotética. Prefira isso a especular.

## Filtro leve antes de listar (não é o crivo completo)

Para cada candidato, antes de incluir na lista:

- **Dor concreta, de qual papel, com que frequência?** Se não conseguir nomear em uma frase, descarte.
- **Já existe um jeito de contornar isso hoje** (mesmo que manual/chato)? Se sim, é melhoria de conveniência — prioridade menor que algo sem solução nenhuma hoje.
- **Cabe na arquitetura existente sem dependência nova?** Se não cabe, ainda liste, mas marque como "precisa de decisão maior" — não deixe implícito que é simples.

## Formato de saída

Lista curta — **no máximo ~8 itens por rodada**. Poucas dores reais vale mais que uma lista longa genérica. Para cada item:

- **O quê**: a melhoria em uma frase.
- **Dor concreta**: o que dói hoje, pra quem, com que frequência.
- **Onde no código**: arquivo(s)/rota(s) relevantes (use o mapeamento de `discipulado-map`, não adivinhe).
- **Tamanho aproximado**: pequeno (1 arquivo) / médio (repository + rota API + UI) / grande (migration + múltiplas telas).

Termine perguntando qual item o usuário quer aprofundar. A partir daí, use **discipulado-roadmap** pra decidir SE e COMO vale a pena, e só então `discipulado-map` pra planejar a implementação.

## Não fazer

- Não proponha dependência nova, automação em background, ou mudança de padrão arquitetural nesta etapa — isso é decisão do `discipulado-roadmap`, com o usuário no loop.
- Não gere lista genérica de "boas práticas de SaaS" (dashboard de analytics, dark mode, notificação push, IA generativa) sem ancorar numa dor real observada no código ou relatada pelo usuário.
- Não implemente nada nesta etapa — o objetivo é a lista, não código.
