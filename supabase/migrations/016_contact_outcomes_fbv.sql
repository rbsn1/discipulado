-- =============================================================
-- 016_contact_outcomes_fbv.sql
-- Novos resultados de tentativa de contato, alinhados ao fluxo de
-- convite pra FBV. Os valores antigos do enum contact_outcome não
-- são removidos (Postgres não permite DROP VALUE sem recriar o
-- tipo) — tentativas de contato já registradas com eles continuam
-- válidas no histórico; só deixam de ser oferecidas como opção no
-- formulário (app passa a expor apenas os valores novos).
-- =============================================================

alter type contact_outcome add value if not exists 'ACEITOU_FBV';
alter type contact_outcome add value if not exists 'NAO_ACEITOU_FBV';
alter type contact_outcome add value if not exists 'CONTATO_ERRADO';
alter type contact_outcome add value if not exists 'NAO_ATENDE';
alter type contact_outcome add value if not exists 'NAO_RESPONDE';
alter type contact_outcome add value if not exists 'OUTROS';
