-- M4 Swarm A Task #9: Private storage buckets + RLS.
-- Three buckets, all private:
--   site-photos      — raw uploaded / Street-View / satellite / annotated images
--   renderings       — AI-generated "after" renderings
--   signed-estimates — PDF copies of accepted estimates + signature images
--
-- Object path convention (enforced by the upload APIs, validated by these policies):
--   site-photos/<project_id>/<filename>
--   renderings/<project_id>/<filename>
--   signed-estimates/<estimate_id>/<filename>
--
-- Forward-only. Re-running is safe (ON CONFLICT for buckets, DROP+CREATE for policies).

insert into storage.buckets (id, name, public)
values
  ('site-photos', 'site-photos', false),
  ('renderings', 'renderings', false),
  ('signed-estimates', 'signed-estimates', false)
on conflict (id) do nothing;

-- =============================================================================
-- site-photos: authenticated sales_rep can read/write objects under a project
-- they own; admin can do anything.
-- =============================================================================
drop policy if exists storage_site_photos_rw on storage.objects;
create policy storage_site_photos_rw on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'site-photos'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.sales_rep_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'site-photos'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.sales_rep_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- renderings: same ownership rule, keyed on project_id in first path segment.
-- =============================================================================
drop policy if exists storage_renderings_rw on storage.objects;
create policy storage_renderings_rw on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'renderings'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.sales_rep_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'renderings'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.sales_rep_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- signed-estimates: keyed on estimate_id in first path segment.
-- =============================================================================
drop policy if exists storage_signed_estimates_rw on storage.objects;
create policy storage_signed_estimates_rw on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'signed-estimates'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.estimates e
        where e.id::text = (storage.foldername(name))[1]
          and e.sales_rep_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'signed-estimates'
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.estimates e
        where e.id::text = (storage.foldername(name))[1]
          and e.sales_rep_id = auth.uid()
      )
    )
  );

-- Customer portal read for signed estimates via token.
-- Reads only; customer cannot upload to this bucket.
drop policy if exists storage_signed_estimates_customer_read on storage.objects;
create policy storage_signed_estimates_customer_read on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'signed-estimates'
    and exists (
      select 1 from public.estimates e
      where e.id::text = (storage.foldername(name))[1]
        and e.customer_view_token::text = coalesce(
          nullif(current_setting('request.jwt.claim.customer_view_token', true), ''),
          nullif(current_setting('request.header.x-customer-view-token', true), '')
        )
    )
  );

-- NOTE: For short-lived signed URLs, reads also succeed via Supabase Storage's
-- built-in signed-URL mechanism which bypasses these policies.
