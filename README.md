# BulletEV Estimate Generator - Test Prototype

A proof-of-concept web app that simulates EV charging estimate generation from standardized SOW (Scope of Work) inputs. Built to validate whether a structured SOW can drive estimate generation with acceptable logic.

## What This Does

1. **Normalized SOW Form** - 12-section structured input form covering customer, site, charger hardware, parking environment, electrical, civil, permits, network, accessories, and estimate controls
2. **Estimate Engine** - Rules-based engine that generates line items, exclusions, and manual review triggers from SOW inputs
3. **Transparency** - Every generated line item shows its pricing source, confidence level, rule name, and explanation
4. **Manual Review Detection** - Automatically flags conditions requiring human judgment (mixed parking, unknown PT slabs, TBD pricing, etc.)
5. **Sample Scenarios** - 4 pre-built scenarios for testing: surface lot hotel, parking garage apartment, mixed environment, and Tesla Supercharger station

## Architecture

```
src/lib/estimate/     -- Business logic (zero React dependencies)
  types.ts            -- TypeScript types for inputs, outputs, line items
  catalog.ts          -- Hardware pricing catalog (Tesla SC, UWC, ChargePoint)
  rules.ts            -- 10 rule categories generating line items
  exclusions.ts       -- 24 standard exclusion templates
  engine.ts           -- Main engine orchestrating rules + calculations
  scenarios.ts        -- 4 sample scenarios
  index.ts            -- Public API

src/lib/monday/       -- monday.com integration
  config.ts           -- Board column ID mappings
  normalize.ts        -- monday item -> EstimateInput converter

src/app/              -- Next.js App Router pages
  page.tsx            -- Landing page
  estimate/page.tsx   -- Main estimator UI
  debug/page.tsx      -- Debug/inspection view
  api/                -- API routes
```

## Running Locally

```bash
cd ev-charging-estimator
npm install
npm run dev
```

Open http://localhost:3000

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page with status and navigation |
| `/estimate` | Main prototype - SOW form + estimate output |
| `/debug` | Raw JSON inspection, catalog viewer, field map |
| `/api/generate-estimate` | POST endpoint for programmatic access |
| `/api/health` | Health check |
| `/api/live/monday-item/[id]` | Live monday.com item fetch (optional) |
| `/e/[id]` | Public interactive estimate (readonly map, Street View, PDF download, chat) |
| `POST /api/estimate/share` | Create shareable estimate record |
| `GET /api/estimate/[id]` | Fetch shared estimate JSON |
| `DELETE /api/estimate/[id]` | Revoke share (see `ESTIMATE_SHARE_REVOKE_SECRET`) |

## Operating Modes

### Offline Mode (default)
Works without any external dependencies. Uses:
- Exported monday.com board schema in `src/lib/monday/config.ts`
- Hardware catalog in `src/lib/estimate/catalog.ts`
- Sample scenarios in `src/lib/estimate/scenarios.ts`

### Live monday.com Mode (optional)
If environment variables are provided, the `/api/live/monday-item/[id]` endpoint can fetch live items from monday.com and normalize them into EstimateInput format.

Required env var: `MONDAY_API_TOKEN`

The app still works fully without this - live mode is an optional enhancement.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONDAY_API_TOKEN` | No | monday.com API token for live item fetch |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (with `SUPABASE_SERVICE_ROLE_KEY`, persists shared estimate links) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service role key for `shared_estimates` table (server-only) |
| `GOOGLE_MAPS_SERVER_KEY` | No | Optional; Street View static previews in PDFs if set (falls back to `NEXT_PUBLIC_GOOGLE_MAPS_KEY`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Satellite static map previews (share + PDF) when `mapWorkspace.siteCoordinates` is set |
| `GEMINI_API_KEY` | No | Plan/drawing analysis (`/api/ai/analyze-plan`) for AI placement hints on the map workspace |
| `ESTIMATE_SHARE_REVOKE_SECRET` | No | If set, `DELETE /api/estimate/[id]` requires `Authorization: Bearer <secret>` to revoke a share link |

### Interactive shared estimates (`/e/[id]`)

- **Share link**: On `/estimate`, generate an estimate and use **Share interactive estimate** — stores JSON via Supabase if configured, otherwise under `data/shared-estimates.json` (local dev; gitignored).
- **Supabase**: Run `supabase/migrations/001_shared_estimates.sql` in the Supabase SQL editor to create the `shared_estimates` table.
- **PDF + site images**: Download from the shared page or estimate view embeds satellite / Street View previews when map coordinates exist and API keys are set.
- **Map workspace**: Plan upload + AI suggestions apply to `mapWorkspace.drawings` for review before syncing to the estimate engine.
- **Revoke**: `DELETE /api/estimate/[id]` with bearer token when `ESTIMATE_SHARE_REVOKE_SECRET` is configured (in production); in development, revoke works without the secret for local testing.

## Deploying to Vercel

### Option 1: Git Push
1. Initialize git repo: `git init && git add -A && git commit -m "Initial commit"`
2. Push to GitHub
3. Import in Vercel dashboard
4. No env vars required for basic operation

### Option 2: Vercel CLI
```bash
npx vercel
```

## Analysis Reports

All discovery and analysis outputs are in `/reports/`:

| File | Description |
|------|-------------|
| `monday_sow_analysis.md` | monday.com SOW board structure analysis |
| `monday_export.json` | Machine-readable board metadata + sample items |
| `monday_missing_questions.md` | 84 missing fields needed for automation |
| `spreadsheet_analysis.md` | Analysis of existing pricing workbooks |
| `catalog_export.json` | Normalized hardware pricing catalog |
| `normalized_input_model.md` | Complete 114-field input model documentation |
| `normalized_input_schema.json` | JSON Schema for validation |
| `sow_to_estimate_field_map.csv` | Field-by-field mapping: monday -> estimate |
| `automation_rules.md` | Detailed rule documentation |
| `manual_review_matrix.md` | All conditions requiring human review |
| `exclusions_logic.md` | Exclusion selection algorithm |
| `pricing_strategy.md` | Pricing hierarchy and gap analysis |
| `live_mode_design.md` | Live monday.com integration design |
| `vercel_deployment.md` | Deployment instructions |
| `test_plan.md` | 80+ test scenarios |

## Key Findings

### What Works
- Tesla Supercharger package pricing is well-structured and automatable
- Responsibility fields (Bullet/Client/TBD) enable conditional line generation
- Parking environment branching (lot vs garage vs mixed) is implementable
- Standard exclusions can be selected algorithmically

### What Needs Work
- **No line-item estimate template exists** - the business currently uses package-level pricing + "site-specific" installation quotes
- **L2 charger pricing is unknown** - Tesla UWC, ChargePoint models have no formal price list
- **84 fields are missing from the monday.com SOW** - only ~20% of data needed for detailed estimates is currently captured
- **Parking environment field** is poorly labeled ("Single select") and unused in all 10 sampled items
- **Electrical, civil, network fields** are free-text or missing entirely

### Critical Gaps
1. No customer/billing contact fields in monday.com
2. No parking environment classification in practice
3. No structured electrical capacity data
4. No network type field
5. No accessory quantity fields (bollard count, sign count)
6. L2 hardware pricing must be sourced

## Prototype Limitations

This is a test model, not production software:
- Installation pricing uses industry-standard ranges, not BulletEV-specific rates
- L2 charger pricing is estimated, not confirmed
- Rules are based on analysis of existing data, not validated by estimators
- No database persistence
- No user authentication
- PDF export is client-side; shared links store estimate JSON for the interactive page

## Next Steps Toward Production

1. **Validate rules with estimators** - have actual estimators review generated estimates against their manual work
2. **Source L2 pricing** - get confirmed pricing for Tesla UWC, ChargePoint, and other L2 models
3. **Calibrate installation rates** - replace industry-standard ranges with BulletEV's actual labor/material rates
4. **Enhance monday.com form** - add the 84 missing fields identified in the analysis
5. **Add persistence** - database-backed estimate storage and versioning
6. **Build approval workflow** - route estimates requiring manual review to the right people
