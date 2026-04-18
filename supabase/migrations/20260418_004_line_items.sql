-- M4 Swarm A Task #9: line_items.
-- Denormalized snapshot of each billable line on an estimate.
-- We snapshot (not FK) so that editing pricing_catalog later won't mutate historical estimates.
-- Forward-only. No DROPs.

create table if not exists public.line_items (
  id              uuid primary key default gen_random_uuid(),
  estimate_id     uuid not null references public.estimates(id) on delete cascade,
  category        text not null,
  sku             text,
  description     text not null,
  quantity        numeric(12, 4) not null default 1,
  unit            text,
  unit_cost       numeric(12, 4) not null default 0,
  extended_cost   numeric(12, 4) not null default 0,
  source_formula  text,
  job_type        text,
  position        int not null default 0,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists line_items_estimate_category_idx
  on public.line_items (estimate_id, category);
create index if not exists line_items_sku_idx on public.line_items (sku);
create index if not exists line_items_job_type_idx on public.line_items (job_type);

drop trigger if exists trg_line_items_set_updated_at on public.line_items;
create trigger trg_line_items_set_updated_at
before update on public.line_items
for each row execute function public.set_updated_at();
