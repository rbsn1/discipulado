-- =============================================================
-- 020_em_acolhimento_status.sql
-- Novo status EM_ACOLHIMENTO — fase antes da confirmação de presença
-- numa Festa de Boas Vindas. Ver 021_em_acolhimento_logic.sql pra
-- regra de transição automática e demais ajustes.
--
-- Sozinho neste arquivo, sem mais nada: ALTER TYPE ADD VALUE não pode
-- ser usado na mesma transação em que o valor novo é referenciado
-- (mesmo racional de 016_contact_outcomes_fbv.sql).
-- =============================================================

alter type case_status add value if not exists 'EM_ACOLHIMENTO' before 'PENDENTE_MATRICULA';
