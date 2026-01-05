-- Tabela de Lançamentos (Despesas e Receitas)
-- Obs: Esta tabela substitui a tabela 'transactions' caso ela não tenha sido criada ainda
-- Se já existir, use o ALTER TABLE abaixo para garantir que todos os campos existam

create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  description text,
  amount numeric not null,
  date date not null default CURRENT_DATE,
  type text check (type in ('income', 'expense')) not null,
  category_id uuid references public.categories(id) on delete set null,
  couple_id uuid references public.couples(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null
);

-- Garantir que todos os campos existam (caso a tabela já tenha sido criada antes)
alter table public.transactions add column if not exists description text;
alter table public.transactions add column if not exists amount numeric;
alter table public.transactions add column if not exists date date default CURRENT_DATE;
alter table public.transactions add column if not exists type text check (type in ('income', 'expense'));
alter table public.transactions add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.transactions add column if not exists couple_id uuid references public.couples(id) on delete cascade;
alter table public.transactions add column if not exists user_id uuid references public.profiles(id) on delete set null;

-- Desabilitar RLS para simplificar (já que outras tabelas estão sem RLS)
alter table public.transactions disable row level security;

-- Índices para melhorar performance
create index if not exists idx_transactions_couple_id on public.transactions(couple_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_category_id on public.transactions(category_id);
