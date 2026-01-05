-- Tabela de Investimentos
create table if not exists public.investments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  type text not null, -- Ex: CDB, Tesouro Direto, Ações, Fundos, etc
  icon text default '💰',
  initial_amount numeric default 0,
  current_amount numeric default 0,
  target_amount numeric, -- Meta opcional
  institution text, -- Banco/Corretora
  couple_id uuid references public.couples(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null
);

-- Tabela de Aportes em Investimentos
create table if not exists public.investment_contributions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  investment_id uuid references public.investments(id) on delete cascade not null,
  amount numeric not null,
  date date not null default CURRENT_DATE,
  description text,
  user_id uuid references public.profiles(id) on delete set null,
  couple_id uuid references public.couples(id) on delete cascade not null
);

-- Garantir que todos os campos existam (caso as tabelas já tenham sido criadas antes)
alter table public.investments add column if not exists name text;
alter table public.investments add column if not exists type text;
alter table public.investments add column if not exists icon text default '💰';
alter table public.investments add column if not exists initial_amount numeric default 0;
alter table public.investments add column if not exists current_amount numeric default 0;
alter table public.investments add column if not exists target_amount numeric;
alter table public.investments add column if not exists institution text;
alter table public.investments add column if not exists couple_id uuid references public.couples(id) on delete cascade;
alter table public.investments add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.investments add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

alter table public.investment_contributions add column if not exists investment_id uuid references public.investments(id) on delete cascade;
alter table public.investment_contributions add column if not exists amount numeric;
alter table public.investment_contributions add column if not exists date date default CURRENT_DATE;
alter table public.investment_contributions add column if not exists description text;
alter table public.investment_contributions add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.investment_contributions add column if not exists couple_id uuid references public.couples(id) on delete cascade;

-- Desabilitar RLS para simplificar
alter table public.investments disable row level security;
alter table public.investment_contributions disable row level security;

-- Índices para melhorar performance
create index if not exists idx_investments_couple_id on public.investments(couple_id);
create index if not exists idx_investments_user_id on public.investments(user_id);
create index if not exists idx_investment_contributions_investment_id on public.investment_contributions(investment_id);
create index if not exists idx_investment_contributions_date on public.investment_contributions(date);

-- Trigger para atualizar updated_at automaticamente
create or replace function update_investments_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists investments_updated_at on public.investments;
create trigger investments_updated_at
  before update on public.investments
  for each row
  execute function update_investments_updated_at();

-- Trigger para atualizar current_amount do investimento quando houver aporte
create or replace function update_investment_amount()
returns trigger as $$
begin
  -- Atualizar o current_amount do investimento somando o aporte
  update public.investments
  set current_amount = current_amount + new.amount
  where id = new.investment_id;

  return new;
end;
$$ language plpgsql;

drop trigger if exists investment_contribution_update_amount on public.investment_contributions;
create trigger investment_contribution_update_amount
  after insert on public.investment_contributions
  for each row
  execute function update_investment_amount();
