-- M4 Swarm A Task #9: Profiles + shared helpers.
-- Creates the user_role enum, the shared set_updated_at() trigger function,
-- and profiles (one row per auth.users user).
-- Forward-only migration. Do NOT add DROPs.

-- Required extension for gen_random_uuid().
create extension if not exists "pgcrypto";

-- Role enum used across RLS policies.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'sales_rep', 'viewer');
  end if;
end$$;

-- Shared trigger function: bumps updated_at on UPDATE.
-- Declared once here; all other tables attach their own trigger that calls this.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles: one row per authenticated user, linked 1-1 with auth.users.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         public.user_role not null default 'sales_rep',
  is_active    boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Helper: is_admin() — used in RLS policies across many tables.
-- SECURITY DEFINER so policies can read profiles without recursive RLS checks.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin' and p.is_active = true
  );
$$;

-- Helper: current_role_is() — convenience wrapper for RLS.
create or replace function public.current_role_is(required public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = required and p.is_active = true
  );
$$;
