-- Phase 2: presentation_shares.
--
-- Backing table for the public customer-facing interactive presentation
-- served at /e/[token]. Canonical data still lives in `estimates` + `projects`
-- — a presentation share is an independent, revocable, expirable link to a
-- specific estimate version, distinct from the formal proposal portal
-- (which uses `estimates.customer_view_token`). Having a separate table
-- lets us:
--   - revoke / expire a customer's interactive link without affecting
--     the signed proposal link
--   - track per-share metadata (capability tokens, view counts, notes)
--     and eventually per-share layout revisions (Phase 4).
--
-- The legacy `public.shared_estimates` JSON-blob table (created in
-- 001_shared_estimates.sql) stays in place during rollout as a
-- read-only fallback for links sales reps already sent before Phase 2.
-- No writes to it from new code. Forward-only, no DROPs.

create table if not exists public.presentation_shares (
  id            uuid primary key default gen_random_uuid(),
  estimate_id   uuid not null references public.estimates(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  created_by    uuid references public.profiles(id) on delete set null,
  token         text not null unique,
  status        text not null default 'active',
  expires_at    timestamptz,
  revoked_at    timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint presentation_shares_status_chk
    check (status in ('active', 'expired', 'revoked'))
);

create index if not exists presentation_shares_estimate_idx
  on public.presentation_shares (estimate_id);
create index if not exists presentation_shares_project_idx
  on public.presentation_shares (project_id);
create unique index if not exists presentation_shares_token_uniq
  on public.presentation_shares (token);
create index if not exists presentation_shares_status_expires_idx
  on public.presentation_shares (status, expires_at);

drop trigger if exists trg_presentation_shares_set_updated_at on public.presentation_shares;
create trigger trg_presentation_shares_set_updated_at
before update on public.presentation_shares
for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.presentation_shares enable row level security;

-- admin + sales-rep-owning-the-project can CRUD.
drop policy if exists presentation_shares_sales_rep_rw on public.presentation_shares;
create policy presentation_shares_sales_rep_rw on public.presentation_shares
  for all
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = presentation_shares.project_id
        and p.sales_rep_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = presentation_shares.project_id
        and p.sales_rep_id = auth.uid()
    )
  );

-- Public customer-side reads go through supabaseAdmin in our server routes.
-- We also expose a token-gated anon select in case a future client-direct
-- path needs it; gated purely on the token being passed via header/JWT
-- claim, never by URL guessing.
drop policy if exists presentation_shares_token_read on public.presentation_shares;
create policy presentation_shares_token_read on public.presentation_shares
  for select
  to anon, authenticated
  using (
    token = coalesce(
      nullif(current_setting('request.jwt.claim.presentation_token', true), ''),
      nullif(current_setting('request.header.x-presentation-token', true), '')
    )
  );
