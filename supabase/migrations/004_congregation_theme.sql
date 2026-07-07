-- =============================================================
-- 004_congregation_theme.sql
-- Adiciona colunas de identidade visual por congregação
-- =============================================================

ALTER TABLE congregations
  ADD COLUMN IF NOT EXISTS logo_url      text,
  ADD COLUMN IF NOT EXISTS accent_color  text NOT NULL DEFAULT '#4F46E5',
  ADD COLUMN IF NOT EXISTS sidebar_color text NOT NULL DEFAULT '#0F172A';

-- Admins da própria congregação podem atualizar o tema
CREATE POLICY "admin can update own congregation theme"
  ON congregations FOR UPDATE
  USING (
    id IN (
      SELECT congregation_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN_PLATAFORMA', 'ADMIN_DISCIPULADO')
    )
  );
