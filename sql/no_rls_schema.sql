-- DATA CLEANUP (DANGEROUS: Wipes all data)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists claim_my_pending_invite();

-- Drop tables in order of dependency
drop table if exists public.couple_invites;
drop table if exists public.couple_members;
drop table if exists public.profiles;
drop table if exists public.couples;

-- RECREATION

-- 1. Couples Table
create table public.couples (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text
);

-- 2. Profiles Table
create table public.profiles (
  id uuid references auth.users not null primary key,
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

-- 3. Invites Table
create table public.couple_invites (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text not null,
  token text not null unique,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  sender_id uuid references public.profiles(id) not null,
  couple_id uuid references public.couples(id)
);

-- NO RLS POLICIES (DISABLE ALL RLS)
alter table public.profiles disable row level security;
alter table public.couples disable row level security;
alter table public.couple_invites disable row level security;

-- TRIGGERS (Keep for convenience of profile creation, or we can move to API)
-- Moving to API is safer if we want full control, but Trigger is robust for "Any Auth Source".
-- User asked: "criar apis para login, registro... nosso app que vai gerenciar".
-- So we can keep the trigger as a fallback or remove it and do it in API.
-- I will keep the trigger because it ensures data integrity even if we use Supabase Console.

create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
