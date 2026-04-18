-- M4 Swarm A Task #9: Row-Level Security policies for all domain tables.
-- Ownership model:
--   - admin: sees all rows on all tables.
--   - sales_rep: sees only rows where sales_rep_id = auth.uid() (or children of such rows).
--   - public (anon/authenticated without a profile): no access except estimates by customer_view_token.
-- Forward-only. Re-running is safe: CREATE POLICY IF NOT EXISTS via drop-then-create.

-- =============================================================================
-- profiles
-- =============================================================================
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select
  using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert
  with check (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =============================================================================
-- customers
-- =============================================================================
alter table public.customers enable row level security;

drop policy if exists customers_sales_rep_rw on public.customers;
create policy customers_sales_rep_rw on public.customers
  for all
  using (sales_rep_id = auth.uid() or public.is_admin(auth.uid()))
  with check (sales_rep_id = auth.uid() or public.is_admin(auth.uid()));

-- =============================================================================
-- projects
-- =============================================================================
alter table public.projects enable row level security;

drop policy if exists projects_sales_rep_rw on public.projects;
create policy projects_sales_rep_rw on public.projects
  for all
  using (sales_rep_id = auth.uid() or public.is_admin(auth.uid()))
  with check (sales_rep_id = auth.uid() or public.is_admin(auth.uid()));

-- =============================================================================
-- estimates
-- =============================================================================
alter table public.estimates enable row level security;

drop policy if exists estimates_sales_rep_rw on public.estimates;
create policy estimates_sales_rep_rw on public.estimates
  for all
  using (sales_rep_id = auth.uid() or public.is_admin(auth.uid()))
  with check (sales_rep_id = auth.uid() or public.is_admin(auth.uid()));

-- Customer portal read: anonymous requests with a valid customer_view_token.
-- The token is passed via the request.jwt.claim `customer_view_token` OR via
-- a `request.header` set by the serverless route that renders the portal.
-- Using current_setting with missing_ok=true keeps this safe for non-portal reqs.
drop policy if exists estimates_customer_token_read on public.estimates;
create policy estimates_customer_token_read on public.estimates
  for select
  using (
    customer_view_token::text = nullif(current_setting('request.jwt.claim.customer_view_token', true), '')
    or customer_view_token::text = nullif(current_setting('request.header.x-customer-view-token', true), '')
  );

-- =============================================================================
-- line_items (scoped via parent estimate ownership)
-- =============================================================================
alter table public.line_items enable row level security;

drop policy if exists line_items_via_estimate on public.line_items;
create policy line_items_via_estimate on public.line_items
  for all
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.estimates e
      where e.id = line_items.estimate_id
        and e.sales_rep_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.estimates e
      where e.id = line_items.estimate_id
        and e.sales_rep_id = auth.uid()
    )
  );

-- Customer portal read of line items belonging to a token-visible estimate.
drop policy if exists line_items_customer_token_read on public.line_items;
create policy line_items_customer_token_read on public.line_items
  for select
  using (
    exists (
      select 1 from public.estimates e
      where e.id = line_items.estimate_id
        and e.customer_view_token::text = coalesce(
          nullif(current_setting('request.jwt.claim.customer_view_token', true), ''),
          nullif(current_setting('request.header.x-customer-view-token', true), '')
        )
    )
  );

-- =============================================================================
-- site_photos (scoped via parent project ownership)
-- =============================================================================
alter table public.site_photos enable row level security;

drop policy if exists site_photos_via_project on public.site_photos;
create policy site_photos_via_project on public.site_photos
  for all
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = site_photos.project_id
        and p.sales_rep_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = site_photos.project_id
        and p.sales_rep_id = auth.uid()
    )
  );

-- =============================================================================
-- renderings (scoped via parent project ownership)
-- =============================================================================
alter table public.renderings enable row level security;

drop policy if exists renderings_via_project on public.renderings;
create policy renderings_via_project on public.renderings
  for all
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = renderings.project_id
        and p.sales_rep_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = renderings.project_id
        and p.sales_rep_id = auth.uid()
    )
  );

-- =============================================================================
-- acceptances (scoped via parent estimate ownership)
-- =============================================================================
alter table public.acceptances enable row level security;

drop policy if exists acceptances_via_estimate on public.acceptances;
create policy acceptances_via_estimate on public.acceptances
  for all
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.estimates e
      where e.id = acceptances.estimate_id
        and e.sales_rep_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.estimates e
      where e.id = acceptances.estimate_id
        and e.sales_rep_id = auth.uid()
    )
  );

-- Customer can INSERT an acceptance for an estimate they hold the token for.
-- Their read is already covered by the estimates token policy above; writes must be
-- performed by the serverless route (service-role) in practice, but this policy lets
-- tokened clients insert if ever routed directly.
drop policy if exists acceptances_customer_token_insert on public.acceptances;
create policy acceptances_customer_token_insert on public.acceptances
  for insert
  with check (
    exists (
      select 1 from public.estimates e
      where e.id = acceptances.estimate_id
        and e.customer_view_token::text = coalesce(
          nullif(current_setting('request.jwt.claim.customer_view_token', true), ''),
          nullif(current_setting('request.header.x-customer-view-token', true), '')
        )
    )
  );

-- =============================================================================
-- pricing_catalog: authenticated read, admin write.
-- =============================================================================
alter table public.pricing_catalog enable row level security;

drop policy if exists pricing_catalog_authenticated_read on public.pricing_catalog;
create policy pricing_catalog_authenticated_read on public.pricing_catalog
  for select
  using (auth.role() = 'authenticated' or public.is_admin(auth.uid()));

drop policy if exists pricing_catalog_admin_write on public.pricing_catalog;
create policy pricing_catalog_admin_write on public.pricing_catalog
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
