-- Tabela de Objetivos Financeiros
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  icon text default '🎯',
  target_amount numeric not null,
  current_amount numeric default 0,
  couple_id uuid references public.couples(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  completed boolean default false,
  completed_at timestamp with time zone
);

-- Garantir que todos os campos existam (caso a tabela já tenha sido criada antes)
alter table public.goals add column if not exists name text;
alter table public.goals add column if not exists icon text default '🎯';
alter table public.goals add column if not exists target_amount numeric;
alter table public.goals add column if not exists current_amount numeric default 0;
alter table public.goals add column if not exists couple_id uuid references public.couples(id) on delete cascade;
alter table public.goals add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.goals add column if not exists completed boolean default false;
alter table public.goals add column if not exists completed_at timestamp with time zone;
alter table public.goals add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Desabilitar RLS para simplificar (já que outras tabelas estão sem RLS)
alter table public.goals disable row level security;

-- Índices para melhorar performance
create index if not exists idx_goals_couple_id on public.goals(couple_id);
create index if not exists idx_goals_user_id on public.goals(user_id);
create index if not exists idx_goals_completed on public.goals(completed);

-- Trigger para atualizar updated_at automaticamente
create or replace function update_goals_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at
  before update on public.goals
  for each row
  execute function update_goals_updated_at();

-- Trigger para marcar como completo automaticamente
create or replace function check_goal_completion()
returns trigger as $$
begin
  if new.current_amount >= new.target_amount and (old.completed = false or old.completed is null) then
    new.completed = true;
    new.completed_at = timezone('utc'::text, now());
  elsif new.current_amount < new.target_amount then
    new.completed = false;
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists goal_completion_check on public.goals;
create trigger goal_completion_check
  before insert or update on public.goals
  for each row
  execute function check_goal_completion();
