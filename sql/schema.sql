-- Create profiles table
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
  couple_id uuid default null
);

-- Create couples table
create table public.couples (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text -- Optional: maybe "Casal [Name] & [Name]"
);

-- Create couple_invites table
create table public.couple_invites (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text not null,
  token text not null unique,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  sender_id uuid references public.profiles(id) not null,
  couple_id uuid references public.couples(id)
);

-- Add couple_id foreign key to profiles (circular dependency handling if needed, but here simple reference)
alter table public.profiles 
add constraint fk_profiles_couple 
foreign key (couple_id) 
references public.couples(id);

-- RLS Policies

-- Profiles: Users can view/edit their own profile
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


-- Couples: Members can view their couple data
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

-- Invites: Sender can view invites they sent
alter table public.couple_invites enable row level security;

create policy "Sender can view sent invites" 
on public.couple_invites for select 
using (sender_id = auth.uid());

create policy "Sender can create invites" 
on public.couple_invites for insert 
with check (sender_id = auth.uid());

create policy "Receiver can view invites by email"
on public.couple_invites for select
using (email = (select email from public.profiles where id = auth.uid()));

-- Function to handle new user creation trigger
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
