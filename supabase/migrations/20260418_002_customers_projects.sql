-- M4 Swarm A Task #9: customers + projects.
-- A sales_rep owns many customers; a customer owns many projects; a project owns many estimates.
-- Forward-only. No DROPs.

-- Project status enum.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('draft', 'active', 'completed');
  end if;
end$$;

-- Customers: company + primary contact + billing.
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  sales_rep_id    uuid references public.profiles(id) on delete set null,
  company_name    text not null,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  billing_address text,
  billing_city    text,
  billing_state   text,
  billing_zip     text,
  notes           text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists customers_sales_rep_idx on public.customers (sales_rep_id);
create index if not exists customers_company_idx on public.customers (company_name);

drop trigger if exists trg_customers_set_updated_at on public.customers;
create trigger trg_customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- Projects: a physical site where chargers will be installed.
create table if not exists public.projects (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  sales_rep_id   uuid references public.profiles(id) on delete set null,
  name           text not null,
  description    text,
  status         public.project_status not null default 'draft',
  address        text,
  city           text,
  state          text,
  zip            text,
  latitude       numeric(10, 7),
  longitude      numeric(10, 7),
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists projects_customer_idx on public.projects (customer_id);
create index if not exists projects_sales_rep_idx on public.projects (sales_rep_id);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_geo_idx on public.projects (latitude, longitude);

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();
