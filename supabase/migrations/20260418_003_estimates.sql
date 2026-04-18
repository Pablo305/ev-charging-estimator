-- M4 Swarm A Task #9: estimates.
-- Each project has many estimate versions. Versions form a parent-child chain.
-- input_json + output_json hold the full estimator payload (schema_version tracks migrations).
-- customer_view_token is a unguessable UUID that exposes this estimate to the customer portal (RLS uses it).
-- Forward-only. No DROPs.
--
-- NOTE: The existing public.shared_estimates table (created in 001_shared_estimates.sql)
-- is a separate JSON-blob sharing table for the public/interactive share flow and is
-- intentionally left untouched. This new public.estimates table is the canonical,
-- normalized record used by the internal sales pipeline.

-- Estimate status enum.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estimate_status') then
    create type public.estimate_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
  end if;
end$$;

create table if not exists public.estimates (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.projects(id) on delete cascade,
  parent_estimate_id    uuid references public.estimates(id) on delete set null,
  version_number        int  not null default 1,
  status                public.estimate_status not null default 'draft',
  schema_version        text not null default '1.0.0',
  input_json            jsonb not null default '{}'::jsonb,
  output_json           jsonb not null default '{}'::jsonb,
  total_cost            numeric(12, 2),
  sales_rep_id          uuid references public.profiles(id) on delete set null,
  customer_view_token   uuid not null unique default gen_random_uuid(),
  sent_at               timestamptz,
  accepted_at           timestamptz,
  rejected_at           timestamptz,
  expires_at            timestamptz,
  notes                 text,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint estimates_version_positive check (version_number >= 1)
);

create index if not exists estimates_project_idx on public.estimates (project_id);
create index if not exists estimates_parent_idx on public.estimates (parent_estimate_id);
create index if not exists estimates_status_idx on public.estimates (status);
create index if not exists estimates_sales_rep_idx on public.estimates (sales_rep_id);
create index if not exists estimates_token_idx on public.estimates (customer_view_token);
create unique index if not exists estimates_project_version_uniq
  on public.estimates (project_id, version_number);

drop trigger if exists trg_estimates_set_updated_at on public.estimates;
create trigger trg_estimates_set_updated_at
before update on public.estimates
for each row execute function public.set_updated_at();
