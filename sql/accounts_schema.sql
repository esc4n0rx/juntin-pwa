-- ============================================
-- CONTAS BANCÁRIAS E CONTAS RECORRENTES
-- ============================================
-- Este schema implementa:
-- 1. Contas bancárias (contas correntes, poupança, carteiras digitais)
-- 2. Contas recorrentes (despesas/receitas que se repetem)
-- 3. Sistema de migração para usuários existentes
-- ============================================

-- 1. TABELA DE CONTAS BANCÁRIAS
create table if not exists public.accounts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Dados da conta
  name text not null,
  type text check (type in ('checking', 'savings', 'investment', 'cash', 'other')) not null,
  initial_balance numeric default 0 not null,
  current_balance numeric default 0 not null,

  -- Flags de controle
  is_migration_account boolean default false, -- Conta criada automaticamente na migração
  is_active boolean default true,

  -- Relacionamentos
  couple_id uuid references public.couples(id) on delete cascade not null,

  -- Metadados
  icon text default '💳',
  color text
);

-- 2. TABELA DE CONTAS RECORRENTES
create table if not exists public.recurring_transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Dados da conta recorrente
  description text not null,
  amount numeric not null,
  type text check (type in ('income', 'expense')) not null,

  -- Frequência
  frequency text check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')) not null,
  day_of_month integer check (day_of_month >= 1 and day_of_month <= 31), -- Para mensal
  day_of_week integer check (day_of_week >= 0 and day_of_week <= 6), -- Para semanal (0 = domingo)

  -- Controle de execução
  start_date date not null, -- Data de início da recorrência
  last_execution_date date, -- Última vez que foi executada
  is_active boolean default true,

  -- Relacionamentos
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete cascade not null,
  couple_id uuid references public.couples(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null -- Quem criou
);

-- 3. ATUALIZAR TABELA DE TRANSAÇÕES
-- Adicionar referência para conta bancária
alter table public.transactions
add column if not exists account_id uuid references public.accounts(id) on delete set null;

-- Adicionar flag para indicar se foi gerada por recorrência
alter table public.transactions
add column if not exists recurring_transaction_id uuid references public.recurring_transactions(id) on delete set null;

-- 4. ÍNDICES PARA PERFORMANCE
create index if not exists idx_accounts_couple_id on public.accounts(couple_id);
create index if not exists idx_accounts_is_active on public.accounts(is_active);
create index if not exists idx_recurring_transactions_couple_id on public.recurring_transactions(couple_id);
create index if not exists idx_recurring_transactions_active on public.recurring_transactions(is_active);
create index if not exists idx_recurring_transactions_next_execution on public.recurring_transactions(last_execution_date) where is_active = true;
create index if not exists idx_transactions_account_id on public.transactions(account_id);
create index if not exists idx_transactions_recurring_id on public.transactions(recurring_transaction_id);

-- 5. DESABILITAR RLS (seguindo padrão do projeto)
alter table public.accounts disable row level security;
alter table public.recurring_transactions disable row level security;

-- 6. FUNÇÃO PARA ATUALIZAR updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers para updated_at
drop trigger if exists update_accounts_updated_at on public.accounts;
create trigger update_accounts_updated_at
  before update on public.accounts
  for each row execute function update_updated_at_column();

drop trigger if exists update_recurring_transactions_updated_at on public.recurring_transactions;
create trigger update_recurring_transactions_updated_at
  before update on public.recurring_transactions
  for each row execute function update_updated_at_column();

-- 7. FUNÇÃO DE MIGRAÇÃO AUTOMÁTICA
-- Esta função cria a "Conta Principal" para usuários existentes
create or replace function migrate_user_to_accounts()
returns json
language plpgsql security definer
as $$
declare
  user_couple_id uuid;
  existing_account_count integer;
  new_account_id uuid;
  transaction_count integer;
  total_income numeric;
  total_expense numeric;
  calculated_balance numeric;
begin
  -- 1. Obter couple_id do usuário atual
  select couple_id into user_couple_id
  from public.profiles
  where id = auth.uid();

  if user_couple_id is null then
    return json_build_object('success', false, 'error', 'Usuário não configurado');
  end if;

  -- 2. Verificar se já tem contas
  select count(*) into existing_account_count
  from public.accounts
  where couple_id = user_couple_id;

  if existing_account_count > 0 then
    return json_build_object('success', false, 'message', 'Usuário já possui contas');
  end if;

  -- 3. Verificar se tem transações
  select count(*) into transaction_count
  from public.transactions
  where couple_id = user_couple_id;

  if transaction_count = 0 then
    return json_build_object('success', false, 'message', 'Usuário não possui transações para migrar');
  end if;

  -- 4. Calcular saldo com base nas transações
  select coalesce(sum(amount), 0) into total_income
  from public.transactions
  where couple_id = user_couple_id and type = 'income';

  select coalesce(sum(amount), 0) into total_expense
  from public.transactions
  where couple_id = user_couple_id and type = 'expense';

  calculated_balance := total_income - total_expense;

  -- 5. Criar Conta Principal
  insert into public.accounts (
    name,
    type,
    initial_balance,
    current_balance,
    is_migration_account,
    couple_id,
    icon
  ) values (
    'Conta Principal',
    'checking',
    0,
    calculated_balance,
    true,
    user_couple_id,
    '🏦'
  ) returning id into new_account_id;

  -- 6. Vincular todas as transações à Conta Principal
  update public.transactions
  set account_id = new_account_id
  where couple_id = user_couple_id
    and account_id is null;

  return json_build_object(
    'success', true,
    'account_id', new_account_id,
    'transactions_migrated', transaction_count,
    'calculated_balance', calculated_balance
  );
end;
$$;

-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
comment on table public.accounts is 'Contas bancárias (corrente, poupança, carteiras digitais, etc)';
comment on table public.recurring_transactions is 'Contas recorrentes (aluguel, assinaturas, salário, etc)';
comment on column public.accounts.is_migration_account is 'Flag que indica se foi criada automaticamente na migração de dados antigos';
comment on column public.recurring_transactions.last_execution_date is 'Última data em que esta recorrência gerou um lançamento';
