-- =============================================================
-- 014_fix_profile_privilege_escalation.sql
-- Corrige escalada de privilégio via UPDATE em profiles e fecha
-- a atribuição de ADMIN_PLATAFORMA para uso exclusivo via console
-- (SQL direto no banco, nunca através da aplicação/API).
--
-- Gap: a policy "profiles_update" (002_rls_policies.sql) não
-- restringia mudanças nas colunas role/congregation_id. Um usuário
-- podia editar o próprio perfil (branch id = auth.uid()) ou, sendo
-- ADMIN_DISCIPULADO, o perfil de outra pessoa na mesma congregação,
-- e setar role livremente — inclusive para ADMIN_PLATAFORMA.
--
-- RLS puro (USING/WITH CHECK) não compara OLD x NEW de forma
-- confiável para esse tipo de regra; um trigger BEFORE UPDATE é o
-- jeito correto de expressar isso no Postgres.
-- =============================================================

create or replace function guard_profile_sensitive_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- ADMIN_PLATAFORMA só pode ser atribuída diretamente no banco
  -- (conexão sem JWT, ex: SQL Editor). Qualquer chamada que chegue
  -- via PostgREST/Supabase client (anon, authenticated ou até
  -- service_role) é rejeitada.
  if new.role = 'ADMIN_PLATAFORMA' and old.role is distinct from new.role then
    if auth.role() is not null then
      raise exception 'Role ADMIN_PLATAFORMA só pode ser atribuída diretamente no banco de dados, fora da aplicação';
    end if;
  end if;

  -- Ninguém altera o próprio role ou congregação por autoatualização
  if new.id = auth.uid()
     and (new.role is distinct from old.role or new.congregation_id is distinct from old.congregation_id)
     and not is_platform_admin() then
    raise exception 'Você não pode alterar seu próprio papel ou congregação';
  end if;

  -- Alterar role/congregação de outra pessoa exige admin de plataforma
  -- ou admin de discipulado da mesma congregação (e nunca mudar a
  -- congregação em si por essa via — só admin de plataforma move
  -- alguém entre congregações)
  if new.id != auth.uid()
     and (new.role is distinct from old.role or new.congregation_id is distinct from old.congregation_id)
     and not (
       is_platform_admin()
       or (
         old.congregation_id = auth_congregation_id()
         and has_role(array['ADMIN_DISCIPULADO']::user_role[])
         and new.congregation_id is not distinct from old.congregation_id
       )
     ) then
    raise exception 'Sem permissão para alterar papel ou congregação deste perfil';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_sensitive_update on profiles;
create trigger trg_guard_profile_sensitive_update
  before update on profiles
  for each row
  execute function guard_profile_sensitive_update();

-- Fecha também a criação: o cadastro de usuário (handle_new_user,
-- disparado por auth.admin.createUser) nunca deve criar um perfil
-- já nascendo como ADMIN_PLATAFORMA.
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  if (new.raw_user_meta_data->>'role') is not null then
    v_role := (new.raw_user_meta_data->>'role')::user_role;

    if v_role = 'ADMIN_PLATAFORMA' then
      raise exception 'Role ADMIN_PLATAFORMA não pode ser atribuída no cadastro; defina manualmente no banco depois de criar o usuário';
    end if;

    insert into profiles (id, name, email, congregation_id, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', new.email),
      new.email,
      (new.raw_user_meta_data->>'congregation_id')::uuid,
      v_role
    );
  end if;
  return new;
end;
$$;
