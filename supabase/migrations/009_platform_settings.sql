-- =============================================================
-- 009_platform_settings.sql
-- Configurações globais da plataforma (não pertencem a uma congregação)
-- =============================================================

create table platform_settings (
  id                    smallint primary key default 1,
  login_verse_text      text not null default 'Ide, portanto, e fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo.',
  login_verse_reference text not null default 'Mateus 28:19',
  updated_at            timestamptz not null default now(),
  constraint platform_settings_singleton check (id = 1)
);

insert into platform_settings (id) values (1);

-- ---------------------------------------------------------------
-- PLATFORM_SETTINGS (RLS)
-- ---------------------------------------------------------------

alter table platform_settings enable row level security;

-- Leitura pública: a tela de login exibe o versículo antes de o usuário autenticar
create policy "platform_settings_select" on platform_settings for select
  using (true);

create policy "platform_settings_update" on platform_settings for update
  using (is_platform_admin());
