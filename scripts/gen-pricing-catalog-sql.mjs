#!/usr/bin/env node
// Generates the body of supabase/migrations/20260418_006_pricing_catalog.sql
// from src/lib/estimate/data/pricingCatalog.json.
// Run: node scripts/gen-pricing-catalog-sql.mjs > /tmp/inserts.sql
//
// The main migration file wraps this output with the CREATE TABLE + RLS hooks.
// This script is intentionally small and side-effect free; re-running is safe
// because the migration uses ON CONFLICT (product_id) DO NOTHING.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(
  __dirname,
  '..',
  'src',
  'lib',
  'estimate',
  'data',
  'pricingCatalog.json',
);

/** @param {unknown} v */
function sqlLiteral(v) {
  if (v === null || v === undefined || v === '') return 'null';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'null';
    return String(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

const raw = readFileSync(CATALOG_PATH, 'utf-8');
/** @type {Array<{category: string, description: string, productId: string, sourceTemplate?: string, unit?: string, unitPrice?: number}>} */
const rows = JSON.parse(raw);

const sorted = [...rows].sort((a, b) => a.productId.localeCompare(b.productId));

const values = sorted.map((r) => {
  const metadata = r.sourceTemplate
    ? `jsonb_build_object('sourceTemplate', ${sqlLiteral(r.sourceTemplate)})`
    : `'{}'::jsonb`;
  return `  (${[
    sqlLiteral(r.productId),
    sqlLiteral(r.description),
    sqlLiteral(r.unit ?? ''),
    sqlLiteral(typeof r.unitPrice === 'number' ? r.unitPrice : 0),
    sqlLiteral(r.category),
    '1.0',
    'true',
    metadata,
  ].join(', ')})`;
});

process.stdout.write(
  `insert into public.pricing_catalog\n` +
    `  (product_id, description, unit, unit_cost, category, markup, active, metadata)\n` +
    `values\n` +
    values.join(',\n') +
    '\n' +
    'on conflict (product_id) do nothing;\n',
);
