-- =============================================================
-- 015_congregation_billing.sql
-- Controle manual de mensalidade por congregação: data de
-- vencimento, histórico de pagamentos, e bloqueio automático de
-- acesso quando a mensalidade vence (ou a congregação é desativada).
--
-- Ponto único de bloqueio: auth_congregation_id() é a base de quase
-- toda política RLS do sistema (profiles, disciples, cases, classes,
-- etc). Ajustando essa função pra retornar null quando a congregação
-- está inativa/inadimplente, o bloqueio vale pro banco inteiro de
-- uma vez só — inclusive contra chamada direta à API do Supabase,
-- não só pela tela. is_platform_admin() não depende dela, então
-- admin de plataforma mantém acesso total pra poder reativar.
-- =============================================================

alter table congregations
  add column if not exists subscription_paid_until date;

comment on column congregations.subscription_paid_until is
  'Data até quando a mensalidade está paga. NULL = sem cobrança definida (ex: em teste). Vencida = acesso bloqueado.';

-- ---------------------------------------------------------------
-- Histórico de pagamentos (log imutável, mesmo padrão de case_events)
-- ---------------------------------------------------------------
create table if not exists congregation_payments (
  id              uuid primary key default gen_random_uuid(),
  congregation_id uuid not null references congregations(id) on delete cascade,
  paid_until      date not null,
  amount          numeric(10,2),
  note            text,
  recorded_by     uuid references profiles(id),
  recorded_at     timestamptz not null default now()
);

create index if not exists idx_congregation_payments_congregation on congregation_payments(congregation_id);

alter table congregation_payments enable row level security;

create policy "congregation_payments_select" on congregation_payments for select
  using (is_platform_admin());

create policy "congregation_payments_insert" on congregation_payments for insert
  with check (is_platform_admin());

-- Sem policy de update/delete: histórico não é editável nem apagável.

-- ---------------------------------------------------------------
-- Registrar pagamento (atualiza vencimento + grava no histórico
-- numa transação só)
-- ---------------------------------------------------------------
create or replace function register_congregation_payment(
  p_congregation_id uuid,
  p_paid_until      date,
  p_amount          numeric default null,
  p_note            text default null
)
returns congregation_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row congregation_payments;
begin
  if not is_platform_admin() then
    raise exception 'Sem permissão para registrar pagamento';
  end if;

  update congregations
    set subscription_paid_until = p_paid_until
    where id = p_congregation_id;

  insert into congregation_payments (congregation_id, paid_until, amount, note, recorded_by)
  values (p_congregation_id, p_paid_until, p_amount, p_note, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------
-- Bloqueio: auth_congregation_id() passa a considerar o status
-- de cobrança da congregação, não só se o perfil está ativo.
-- ---------------------------------------------------------------
create or replace function auth_congregation_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select p.congregation_id
  from profiles p
  join congregations c on c.id = p.congregation_id
  where p.id = auth.uid()
    and p.is_active = true
    and c.is_active = true
    and (c.subscription_paid_until is null or c.subscription_paid_until >= current_date)
  limit 1;
$$;

-- ---------------------------------------------------------------
-- Status de acesso do usuário logado — usado pela tela pra explicar
-- *por que* está bloqueado. Não depende de auth_congregation_id()
-- (que já retorna null nesse caso), então funciona mesmo bloqueado.
-- ---------------------------------------------------------------
create or replace function get_my_access_status()
returns table (
  blocked            boolean,
  reason             text,
  congregation_name  text,
  paid_until         date
)
language sql stable security definer
set search_path = public
as $$
  select
    case
      when p.congregation_id is null then false
      when c.is_active is not true then true
      when c.subscription_paid_until is not null and c.subscription_paid_until < current_date then true
      else false
    end,
    case
      when p.congregation_id is null then null
      when c.is_active is not true then 'inactive'
      when c.subscription_paid_until is not null and c.subscription_paid_until < current_date then 'overdue'
      else null
    end,
    c.name,
    c.subscription_paid_until
  from profiles p
  left join congregations c on c.id = p.congregation_id
  where p.id = auth.uid()
  limit 1;
$$;
