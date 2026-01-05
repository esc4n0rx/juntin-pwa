-- 1. Modify Tables
-- Move income from profiles to couples for shared view
alter table public.couples 
add column if not exists income_amount numeric default 0,
add column if not exists income_frequency text default 'monthly';

-- Remove from profiles (optional, or keep as individual contribution? User said "Renda Conjunta", so Couples is better)
-- alter table public.profiles drop column income_amount;
-- alter table public.profiles drop column income_frequency;

-- 2. Categories Table (Ensure it exists)
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  icon text,
  color text,
  type text check (type in ('income', 'expense')) not null,
  budget_limit numeric default 0,
  couple_id uuid references public.couples(id) on delete cascade
);

-- 3. Transactions Table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  description text not null,
  amount numeric not null,
  date date not null default CURRENT_DATE,
  type text check (type in ('income', 'expense')) not null,
  category_id uuid references public.categories(id) on delete set null,
  couple_id uuid references public.couples(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null
);

