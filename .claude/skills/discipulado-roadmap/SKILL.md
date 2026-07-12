---
name: discipulado-roadmap
description: Use ao planejar melhorias, automações, integrações ou features novas para o app "discipulado" (não para implementar bugfix/feature já decidida — para decidir SE e COMO vale a pena fazer). Traz critérios de avaliação (segurança, simplicidade, encaixe na arquitetura) e um roteiro pra propor a menor solução viável, evitando inchar o código com generalizações não pedidas. Gatilhos: "planejar próxima versão", "o que adicionar", "vale a pena integrar com X", "nova automação", "roadmap", "proposta de melhoria", "como evoluir o sistema".
---

# Planejamento de melhorias — discipulado

Este app é usado por líderes de igreja, muitos pouco técnicos, num contexto de voluntariado (sem equipe de TI dedicada, sem orçamento de manutenção contínua). Toda proposta de melhoria deve ser julgada por esse contexto, não pelo que seria "legal ter" num SaaS genérico.

## Antes de propor qualquer coisa

1. Leia a skill **discipulado-map** primeiro — ela documenta o que já existe (arquitetura, modelo de dados, rotas, padrões estabelecidos). Uma proposta que ignora o que já está construído tende a duplicar ou contradizer algo.
2. Pergunte: **qual dor real, de qual papel de usuário (`ADMIN_PLATAFORMA`, `ADMIN_DISCIPULADO`, `DISCIPULADOR`, `SECRETARIA_DISCIPULADO`, `SM_DISCIPULADO`), essa mudança resolve?** Se a resposta é "seria legal ter" ou "outros sistemas têm isso", não é motivo suficiente — volte e ache a dor concreta primeiro, ou descarte a ideia.

## Critérios de avaliação

Toda proposta — automação, integração, feature nova — passa por isso antes de virar plano:

### 1. Segurança primeiro
- Isolamento multi-tenant (`congregation_id`) continua garantido em dois níveis (RLS + checagem na aplicação)? Uma integração/automação que roda com `security definer` ou service role precisa derivar o tenant do usuário autenticado, nunca confiar num parâmetro vindo do cliente (ver `get_dashboard_stats`/`get_report_stats` como exemplo do padrão certo).
- Novo papel, permissão ou rota admin: o que acontece se um usuário sem esse papel tentar acessar? Tem que redirecionar/negar nos dois níveis, igual ao resto do app.
- Integração externa (webhook, API de terceiro): onde ficam as credenciais? Nunca no client, nunca logadas. Qual o dano se essa credencial vazar?
- Automação que roda sem interação humana (cron, trigger, webhook recebido): o que ela pode fazer de errado sozinha, e tem como conter o estrago (idempotência, rate limit, dry-run)?

### 2. Simplicidade antes de generalidade (YAGNI)
- Resolve o caso concreto de hoje, ou já está generalizando pra casos hipotéticos de amanhã? Prefira a versão específica — generalizar quando o segundo caso real aparecer, não antes.
- Isso pede uma tabela de configuração genérica (key-value, feature flags) quando um campo tipado numa tabela existente resolveria? Prefira o campo tipado (ver `platform_settings` como exemplo: colunas nomeadas, não um KV store).
- Isso pede uma automação/serviço novo rodando em background quando um RPC ou trigger Postgres já resolveria dentro da transação existente? Esse app não tem fila de jobs nem worker — antes de introduzir um, confirme que não cabe no modelo request/response + trigger que já existe.
- Menos código que faz a coisa certa é melhor que mais código "preparado pro futuro".

### 3. Encaixe na arquitetura existente
- Segue o padrão já estabelecido (`page.tsx` server + `client.tsx`, repository → API route com `getCurrentProfile()` → checagem de papel → repository, RLS com `is_platform_admin()`/`auth_congregation_id()`/`has_role()`)? Uma proposta que introduz um padrão paralelo (outro jeito de buscar dados, outra lib de formulário, outro client Supabase) precisa de justificativa forte — geralmente não vale a inconsistência.
- Não introduza `react-hook-form`/`zod` (estão no `package.json` mas não são usados em lugar nenhum), nova lib de state management, ORM, ou client de API sem confirmar com o usuário antes — isso muda o padrão do projeto pra sempre, não só pra essa feature.

### 4. Custo operacional de automações/integrações
- Quem monitora isso quando quebrar silenciosamente? Este projeto não tem observability/alerting hoje — uma automação que falha sem avisar ninguém é pior que não ter automação.
- Integração com serviço externo = mais uma coisa que pode cair, mais uma env var pra configurar em cada ambiente, mais uma coisa pra documentar no README. Vale o ganho?
- Prefira automações que falham de forma visível e segura (erro claro pro usuário, log) a automações "mágicas" que escondem problema.

### 5. Reversibilidade
- Dá pra desligar essa feature sem migration destrutiva? Migrations aditivas (nova tabela/coluna) são baratas de reverter; alterar/dropar coluna existente não é.
- Se for uma automação que já rodou (enviou mensagem, alterou dado em lote), tem como auditar o que ela fez (`case_events` já é o padrão de trilha de auditoria deste app — reaproveite em vez de inventar outro).

## Roteiro pra propor uma melhoria

1. **Dor concreta**: quem sente, com que frequência, o quão grave é hoje sem a mudança.
2. **Menor solução viável**: a versão mais simples que resolve a dor. Resista a incluir "já que estou mexendo, vou fazer X também" — isso vira outra proposta, separada.
3. **Fora de escopo, explicitamente**: liste o que essa proposta *não* faz, pra não virar escopo aberto durante a implementação.
4. **Impacto em segurança/multi-tenant**: resposta direta aos pontos da seção 1.
5. **Plano de reversão**: como desligar/reverter se algo der errado.

Só depois disso vira um plano de implementação (arquivos a tocar, migration, etc.) — segue o fluxo normal descrito na skill `discipulado-map`.

## Sinal de alerta: parar e perguntar ao usuário

- A proposta introduz uma dependência nova (npm package, serviço externo, fila de background).
- A proposta muda um padrão já estabelecido no código (forma de autenticar, buscar dado, validar formulário).
- Você não consegue nomear a dor concreta que motiva a mudança — só "seria uma boa prática".
- A proposta é maior que a menor solução viável e você não tem certeza se o extra foi pedido.

Nesses casos, pare e pergunte antes de planejar/implementar — não assuma.
