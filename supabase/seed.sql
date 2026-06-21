-- =============================================================
-- seed.sql — dados mínimos para desenvolvimento
-- =============================================================
-- ATENÇÃO: Este seed cria usuários via INSERT direto em auth.users
-- e só deve ser usado em ambiente local/desenvolvimento Supabase.
-- Em produção, crie o primeiro admin manualmente no painel Supabase.
-- =============================================================

-- Congregação de desenvolvimento
insert into congregations (id, name, timezone) values
  ('11111111-1111-1111-1111-111111111111', 'Igreja Central (DEV)', 'America/Sao_Paulo'),
  ('22222222-2222-2222-2222-222222222222', 'Igreja Norte (DEV)', 'America/Sao_Paulo');

-- Usuários Auth (DEV apenas)
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'admin@plataforma.dev',
    crypt('senha123', gen_salt('bf')),
    now(),
    '{"role":"ADMIN_PLATAFORMA","name":"Admin Plataforma"}'::jsonb,
    now(), now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'admin@central.dev',
    crypt('senha123', gen_salt('bf')),
    now(),
    '{"role":"ADMIN_DISCIPULADO","congregation_id":"11111111-1111-1111-1111-111111111111","name":"Admin Central"}'::jsonb,
    now(), now()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'discipulador@central.dev',
    crypt('senha123', gen_salt('bf')),
    now(),
    '{"role":"DISCIPULADOR","congregation_id":"11111111-1111-1111-1111-111111111111","name":"Discipulador Central"}'::jsonb,
    now(), now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'secretaria@central.dev',
    crypt('senha123', gen_salt('bf')),
    now(),
    '{"role":"SECRETARIA_DISCIPULADO","congregation_id":"11111111-1111-1111-1111-111111111111","name":"Secretária Central"}'::jsonb,
    now(), now()
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'admin@norte.dev',
    crypt('senha123', gen_salt('bf')),
    now(),
    '{"role":"ADMIN_DISCIPULADO","congregation_id":"22222222-2222-2222-2222-222222222222","name":"Admin Norte"}'::jsonb,
    now(), now()
  );

-- Módulos da Igreja Central
insert into module_templates (congregation_id, title, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Fundamentos da Fé', 1),
  ('11111111-1111-1111-1111-111111111111', 'Vida em Comunidade', 2),
  ('11111111-1111-1111-1111-111111111111', 'Missão e Propósito', 3),
  ('11111111-1111-1111-1111-111111111111', 'Crescimento Espiritual', 4);

-- Módulos da Igreja Norte
insert into module_templates (congregation_id, title, sort_order) values
  ('22222222-2222-2222-2222-222222222222', 'Bases do Discipulado', 1),
  ('22222222-2222-2222-2222-222222222222', 'Integração Ministerial', 2);

-- Turmas da Igreja Central
insert into classes (congregation_id, name, shift) values
  ('11111111-1111-1111-1111-111111111111', 'Turma Manhã - Jan/2026', 'MANHA'),
  ('11111111-1111-1111-1111-111111111111', 'Turma Noite - Jan/2026', 'NOITE');
