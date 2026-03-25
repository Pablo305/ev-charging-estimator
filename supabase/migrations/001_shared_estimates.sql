-- Shared interactive estimates (JSON payload). Run in Supabase SQL editor or via CLI.
create table if not exists public.shared_estimates (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_estimates_updated_at_idx
  on public.shared_estimates (updated_at desc);

-- RLS on with no policies: blocks direct client access; server routes use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
alter table public.shared_estimates enable row level security;
