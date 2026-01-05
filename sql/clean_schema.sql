-- DATA CLEANUP (DANGEROUS: Wipes all data)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop tables in order of dependency
drop table if exists public.couple_invites;
drop table if exists public.couple_members; -- If it existed in prev versions
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

-- RLS POLICIES

-- Profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile" 
on public.profiles for select 
using (auth.uid() = id);

create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = id);

create policy "Users can insert own profile" 
on public.profiles for insert 
with check (auth.uid() = id);

-- Couples
alter table public.couples enable row level security;

create policy "Members can view their couple" 
on public.couples for select 
using (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.couple_id = couples.id
  )
);

-- Invites
alter table public.couple_invites enable row level security;

create policy "Sender can view sent invites" 
on public.couple_invites for select 
using (sender_id = auth.uid());

create policy "Sender can create invites" 
on public.couple_invites for insert 
with check (sender_id = auth.uid());

create policy "Receiver can view pending invites" 
on public.couple_invites for select 
using (
  lower(email) = lower((select email from public.profiles where id = auth.uid()))
);


-- TRIGGERS

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


-- RPC FUNCTION: Claim Pending Invite
-- Scans for a pending invite for the current user's email.
-- If found, executes all linking logic (Couple creation, Profile updates).
create or replace function claim_my_pending_invite()
returns json
language plpgsql security definer
as $$
declare
  user_email text;
  invite_record record;
  sender_profile record;
  new_couple_id uuid;
begin
  -- 1. Get current user email
  select email into user_email from auth.users where id = auth.uid();
  if user_email is null then
    return json_build_object('success', false, 'error', 'No email found for user');
  end if;

  -- 2. Find pending invite
  select * into invite_record
  from public.couple_invites
  where lower(email) = lower(user_email)
  and status = 'pending'
  limit 1;

  if invite_record.id is null then
    return json_build_object('success', false, 'message', 'No pending invite found');
  end if;

  -- 3. Get Sender Profile
  select * into sender_profile from public.profiles where id = invite_record.sender_id;
  
  -- 4. Determine Couple ID
  if sender_profile.couple_id is not null then
    new_couple_id := sender_profile.couple_id;
  else
    -- Create new couple
    insert into public.couples (name) values (null) returning id into new_couple_id;
    
    -- Update Sender
    update public.profiles set couple_id = new_couple_id where id = sender_profile.id;
  end if;

  -- 5. Update Current User (Receiver)
  update public.profiles 
  set couple_id = new_couple_id,
      mode = 'couple',
      setup = true
  where id = auth.uid();

  -- 6. Update Invite Status
  update public.couple_invites 
  set status = 'accepted',
      couple_id = new_couple_id
  where id = invite_record.id;

  return json_build_object('success', true, 'couple_id', new_couple_id);
end;
$$;
