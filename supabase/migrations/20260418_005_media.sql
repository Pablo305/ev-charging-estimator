-- M4 Swarm A Task #9: site_photos, renderings, acceptances.
-- Media belongs to projects (photos + AI renderings) and estimates (customer acceptances).
-- storage_path points at private Supabase Storage objects (buckets created in 008).
-- Forward-only. No DROPs.

-- site_photos: street-view / satellite / uploaded / annotated images for a project site.
create table if not exists public.site_photos (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  uploaded_by     uuid references public.profiles(id) on delete set null,
  kind            text not null,
  heading         numeric(6, 2),
  pitch           numeric(6, 2),
  fov             numeric(6, 2),
  location_label  text,
  latitude        numeric(10, 7),
  longitude       numeric(10, 7),
  storage_path    text not null,
  mime_type       text,
  width           int,
  height          int,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint site_photos_kind_chk
    check (kind in ('street_view', 'satellite', 'uploaded', 'annotated'))
);

create index if not exists site_photos_project_idx on public.site_photos (project_id);
create index if not exists site_photos_kind_idx on public.site_photos (kind);

drop trigger if exists trg_site_photos_set_updated_at on public.site_photos;
create trigger trg_site_photos_set_updated_at
before update on public.site_photos
for each row execute function public.set_updated_at();

-- renderings: AI-generated "after" images derived from a source site_photo.
create table if not exists public.renderings (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  source_photo_id  uuid references public.site_photos(id) on delete set null,
  requested_by     uuid references public.profiles(id) on delete set null,
  model_used       text,
  prompt           text,
  status           text not null default 'queued',
  storage_path     text,
  error            text,
  cost_usd         numeric(10, 4),
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint renderings_status_chk
    check (status in ('queued', 'processing', 'complete', 'failed'))
);

create index if not exists renderings_project_idx on public.renderings (project_id);
create index if not exists renderings_source_idx on public.renderings (source_photo_id);
create index if not exists renderings_status_idx on public.renderings (status);

drop trigger if exists trg_renderings_set_updated_at on public.renderings;
create trigger trg_renderings_set_updated_at
before update on public.renderings
for each row execute function public.set_updated_at();

-- acceptances: customer signature + metadata when an estimate is accepted.
create table if not exists public.acceptances (
  id                 uuid primary key default gen_random_uuid(),
  estimate_id        uuid not null references public.estimates(id) on delete cascade,
  signer_name        text not null,
  signer_email       text,
  signer_ip          inet,
  signer_user_agent  text,
  signature_svg      text,
  pdf_storage_path   text,
  accepted_at        timestamptz not null default now(),
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists acceptances_estimate_idx on public.acceptances (estimate_id);

drop trigger if exists trg_acceptances_set_updated_at on public.acceptances;
create trigger trg_acceptances_set_updated_at
before update on public.acceptances
for each row execute function public.set_updated_at();
