# Melhorias futuras — levantamento (não implementado)

Data do levantamento: 2026-08-12.

Critério pedido explicitamente: melhorias que agreguem valor real, **sem** complicar o processo operacional de quem usa (voluntários de igreja, sem TI dedicada) e **sem** abrir brecha de segurança. Levantado varrendo o código atual (TODOs, gaps já documentados, enums vs. catálogos, cobertura de logs/RLS) — não é lista genérica de SaaS.

Nada aqui foi implementado. Antes de implementar qualquer item, passar pela skill `discipulado-roadmap` (segurança, simplicidade, encaixe na arquitetura, reversibilidade) com o usuário no loop.

---

## 1. Catálogo editável de motivos de contato (`ContactOutcome`)

- **O quê**: transformar o enum fixo `ContactOutcome` (`ACEITOU_FBV`, `NAO_ACEITOU_FBV`, `CONTATO_ERRADO`, `NAO_ATENDE`, `NAO_RESPONDE`, `OUTROS`) numa tabela catálogo editável pelo admin, igual já foi feito para `class_shifts` (turnos) e `departments`.
- **Dor concreta**: os motivos de contato são específicos de um fluxo pastoral (nomenclatura "FBV"); se a congregação quiser ajustar a lista de resultados possíveis, hoje precisa de uma migration nova. A própria existência de um `OUTROS` como fallback é sinal de que a lista já foi sentida como insuficiente pelo menos uma vez.
- **Onde no código**: `src/types/index.ts` (tipo `ContactOutcome`), `supabase/migrations/016_contact_outcomes_fbv.sql`, tela de registro de contato em `/discipulandos/[id]`.
- **Tamanho**: médio — repete a receita já validada duas vezes no projeto (migration de catálogo + FK + RLS + tela admin).
- **Por que não complica nem abre brecha**: segue exatamente o padrão já em produção; RLS de catálogo já testado; não muda quem pode ver o quê.

## 2. Log mínimo nas rotas de API que hoje falham em silêncio

- **Dor concreta**: 21 das 23 rotas em `src/app/api/**` têm `catch (err: unknown)` sem nenhum `console.error` — só 2 rotas logam hoje (`disciples` e `logo`). Sem serviço de observability contratado, o único registro possível de um erro é o log do provedor de hosting, que só existe se o código chamar `console.error`. Hoje, se uma automação (ex.: os triggers de `EM_ACOLHIMENTO`) falhar num caso de borda, ninguém vê nada — nem no painel, nem em log nenhum.
- **Onde no código**: lista completa de rotas sem log está no levantamento (ex.: `src/app/api/cases/[id]/assign/route.ts`, `src/app/api/events/[id]/confirmations/route.ts`, `src/app/api/classes/enroll/route.ts`, entre outras 18).
- **Tamanho**: pequeno — é replicar um padrão que já existe em 2 arquivos, sem dependência nova.
- **Cuidado de segurança**: logar só `err.message`, nunca o corpo bruto da requisição (evita vazar dado pessoal de discipulando em log).
- **Vercel muda o cálculo deste item**: se o app está hospedado na Vercel, `console.error` de uma rota de API já aparece nos **Runtime Logs** do painel da Vercel sem nenhuma integração ou serviço pago — não precisa contratar Sentry/Datadog pra ter esse mínimo. Isso torna o item ainda mais barato do que parecia: é só disciplina de código, o "observability" já existe de graça na plataforma onde o app já roda.

## 3. Marcar desde quando um caso está "sem responsável"

- **Dor concreta**: a métrica `sem_responsavel` do painel hoje é só uma contagem — não dá pra saber se um caso está sem responsável há 1 dia ou há 3 meses. Quem abre o painel não consegue priorizar sem clicar em cada caso individualmente.
- **Onde no código**: `discipleship_cases` (precisaria de uma coluna nova, tipo `unassigned_since`), RPC `get_dashboard_stats()` (`supabase/migrations/011_dashboard_stats_rpc.sql`), board de `/acolhimento`.
- **Tamanho**: médio — migration aditiva + trigger simples pra popular a coluna quando `assigned_to` vira null + ajuste de ordenação na tela.
- **Por que não complica**: é passivo — só melhora informação que já existe na tela que o usuário já visita, não manda nada pra ninguém, não introduz dependência externa.
- **Fora de escopo aqui, de propósito**: notificação proativa (e-mail/WhatsApp quando um caso fica muito tempo sem responsável) teria mais valor ainda, mas exige dependência externa nova (serviço de e-mail, cron) e ninguém pra monitorar se essa automação quebrar — isso é decisão maior, separada, a avaliar depois com calma via `discipulado-roadmap`.
- **Vercel muda parte desse cálculo**: o pedaço "cron" da notificação proativa deixa de ser uma automação externa nova — a Vercel tem **Cron Jobs nativos** (`vercel.json`, chama uma rota de API num horário fixo), sem precisar de fila/worker separado, o que é exatamente o tipo de coisa que o `discipulado-roadmap` pede pra confirmar antes de introduzir automação em background. O pedaço que falta é só o canal de envio (e-mail) — a Vercel tem integração oficial no Marketplace com a Resend (feita pelo mesmo pessoal do Next.js, bem comum nesse stack), o que reduz a decisão a "vale abrir uma conta de e-mail transacional" em vez de "vale montar uma automação inteira do zero". Ainda assim é uma dependência nova — não virou item da lista principal, só ficou mais barata de avaliar depois.

## 4. Exportação completa dos dados da congregação (self-serve backup)

- **Dor concreta**: hoje só existe exportação pontual em CSV (relatório de casos, lista de confirmação de um evento). Não existe um jeito do admin da congregação baixar um dump completo dos próprios dados. Em um projeto sem TI dedicada e sem orçamento de manutenção, se a conta Supabase tiver problema, for suspensa por falta de pagamento, ou o app sair do ar, a congregação não tem como recuperar nada do que registrou.
- **Onde no código**: nova rota admin-only, reaproveitando `toCSV`/`downloadCSV` já existentes em `src/lib/utils.ts`, um CSV por tabela relevante (discípulos, casos, eventos, turmas).
- **Tamanho**: médio.
- **Cuidado de segurança**: restringir a `ADMIN_DISCIPULADO`/`ADMIN_PLATAFORMA`, sempre escopado por `congregation_id` — mesma checagem dupla (RLS + aplicação) já usada em todo o resto do app. Sem isso, seria a maior brecha de vazamento de dado pessoal do projeto.
- **Vercel muda o cálculo deste item**: em vez de gerar o arquivo na hora (lento, pode estourar timeout de função serverless em congregação grande) e mandar direto pro navegador, dá pra gerar o dump e guardar no **Vercel Blob** (storage nativo, sem contratar outro provedor), servindo um link de download temporário pro admin. Continua precisando da mesma restrição de papel + `congregation_id` de qualquer forma — o Blob só resolve "onde guardar o arquivo", não substitui a checagem de acesso.

## 5. Revisar proteção de login (rate limit / bloqueio por tentativas)

- **Dor concreta**: não há nenhuma camada própria de limitação de tentativas de login no código (`src/lib/actions/auth.ts` chama `supabase.auth.signInWithPassword` direto, sem lockout, sem CAPTCHA). A proteção existente, se houver, é só a padrão da plataforma Supabase (GoTrue) — não confirmada nem configurada explicitamente por este projeto.
- **Onde no código**: `src/lib/actions/auth.ts`, `src/proxy.ts`.
- **Tamanho**: pequeno a médio, dependendo da abordagem.
- **Atenção — este item pede cuidado extra antes de implementar**: um lockout mal calibrado é exatamente o tipo de coisa que **complica o processo** pra um voluntário que errou a senha duas vezes e agora não consegue mais entrar sem ajuda técnica que o projeto não tem. Antes de codar algo, vale confirmar o que o Supabase já garante por padrão no plano usado — pode ser que o gap real seja menor do que parece.
- **Vercel muda o cálculo deste item**: em vez de lockout de conta dentro do app (que trava o próprio voluntário), a Vercel tem **Firewall/rate limiting na borda** (bloqueia por IP antes mesmo de chegar na rota de login) — mais seguro contra ataque de força bruta e sem risco de travar a conta de quem só errou a senha. É o tipo de proteção que resolve o gap de segurança sem criar a complicação operacional que esse item tentava evitar. Ressalva: regras de Firewall personalizadas costumam exigir plano Pro da Vercel — vale confirmar qual plano está em uso antes de contar com isso.

---

## Nota à parte (não é melhoria, é bug pequeno)

`CaseEventType` (`src/types/index.ts`, por volta da linha 45) tem o valor `DESmatricula` com grafia inconsistente (deveria ser `DESMATRICULA`, como o resto do enum, todo maiúsculo). Não afeta usuário final (é um tipo interno de evento da timeline de auditoria), mas vale corrigir num momento de baixo risco — exige checar todos os lugares que comparam essa string antes de mudar.

---

## Descartado desta rodada (não atende ao critério do usuário)

Não entrou nada de "boa prática genérica de SaaS" (dashboard de analytics, IA generativa, notificação push) sem dor concreta observada no código — nenhum candidato desse tipo apareceu no levantamento.

---

**Próximo passo, quando o usuário quiser**: escolher um item daqui e rodar a skill `discipulado-roadmap` nele antes de qualquer implementação.
