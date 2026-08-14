-- =============================================================
-- 024_attendance_makeup.sql
-- Hoje a frequência só mostra a CONTAGEM de faltas justificadas
-- (discipleship_cases.justified_count) — não dá pra saber QUAL aula
-- foi justificada, então ninguém consegue organizar a reposição.
-- attendance_items já sabe exatamente qual lesson_id foi justificado;
-- só faltava um jeito de marcar quando aquela aula específica foi
-- reposta, pra sair da lista de pendências.
--
-- Não mexe em total_lessons/attendance_rate nem no trigger de
-- recálculo — "reposta" é só controle de acompanhamento, não afeta
-- a fórmula de frequência (justificada nunca prejudicou o cálculo).
-- =============================================================

alter table attendance_items
  add column if not exists made_up boolean not null default false;
