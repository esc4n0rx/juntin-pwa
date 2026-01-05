-- CLEANUP
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists claim_my_pending_invite();

drop table if exists public.couple_invites;
drop table if exists public.profiles;
drop table if exists public.users; -- Custom Users Table
drop table if exists public.couples;

-- 1. Couples Table
create table public.couples (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text
);

-- 2. Custom Users Table (Replaces auth.users)
create table public.users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Profiles Table
create table public.profiles (
  id uuid references public.users(id) not null primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- JUNTIN specific fields
  setup boolean default false,
  mode text check (mode in ('solo', 'couple')) default null,
  couple_id uuid references public.couples(id) default null
);

-- 4. Invites Table
create table public.couple_invites (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text not null,
  token text not null unique,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  sender_id uuid references public.profiles(id) not null,
  couple_id uuid references public.couples(id)
);

-- DISABLE RLS
alter table public.users disable row level security;
alter table public.profiles disable row level security;
alter table public.couples disable row level security;
alter table public.couple_invites disable row level security;
