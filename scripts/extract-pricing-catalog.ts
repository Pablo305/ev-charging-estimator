/**
 * extract-pricing-catalog.ts
 * Swarm B #4: read-only pass across the 9 Bullet EV Excel estimate templates.
 * - Pulls the master "PRODUCT & DESCRIPTION INPUT" sheet into a deduped catalog.
 * - Walks each main estimate sheet (rows 15-60) and records each line item
 *   formula; flags rows with blank col-E qty as template defects.
 * Usage:  npm run extract:catalog
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';

const TEMPLATES_DIR = '/mnt/c/Users/pmend/Bullet ev estimating/Estimate template/TEMPLATES';
const CATALOG_SHEET = 'PRODUCT & DESCRIPTION INPUT';

type WS = XLSX.WorkSheet;
// Standard layout: E=qty, F=product, G=desc, L=price, M=ext (0-based)
const STD = { qty: 4, product: 5, desc: 6, price: 11, ext: 12 };
// Service Ticket shifts left two cols.
const SVC = { qty: 2, product: 3, desc: 4, price: 9, ext: 10 };

interface TemplateSpec {
  id: string;
  file: string;
  header: number;
  cols: typeof STD;
}

const TEMPLATES: TemplateSpec[] = [
  { id: 'resi-ev', file: '6 - RESI EV TEMPLATE_.xlsx', header: 18, cols: STD },
  { id: 'install-commission', file: '7 - INSTALL & COMMISSION TEMPLATE.xlsx', header: 18, cols: STD },
  { id: 'commissioning-only', file: '8- COMMISSIONING ONLY.xlsx', header: 18, cols: STD },
  { id: 'equipment-only', file: '9 - EQUIPMENT ONLY PURCHASE.xlsx', header: 18, cols: STD },
  { id: 'remove-replace', file: '10 - REMOVE & REPLACE.xlsx', header: 18, cols: STD },
  { id: 'service-ticket', file: '11 - SERVICE TICKET TEMPLATE.xlsx', header: 25, cols: SVC },
  { id: 'garage-full-turnkey', file: '12 - (GARAGE) FULL TURNKEY.xlsx', header: 18, cols: STD },
  { id: 'parking-lot-full-turnkey', file: '13 - (PARKING LOT) FULL TURNKEY.xlsx', header: 18, cols: STD },
  { id: 'supercharger', file: 'ESTIMATE - SUPERCHARGER.xlsx', header: 18, cols: STD },
];

interface CatalogEntry {
  productId: string;
  description: string;
  unitPrice: number;
  category: string;
  unit: string;
  sourceTemplate: string;
  variant?: string;
}
interface FormulaRow {
  row: number;
  productId: string;
  qtyFrom: string;
  defectInTemplate: boolean;
  raw: {
    colE_qty: number | string | null;
    colG_description: string;
    colK_or_L_price: number | string | null;
    colM_extended: number | string | null;
    isBlankQty: boolean;
  };
}
interface JobTypeFormula {
  templateSource: string;
  lineItems: FormulaRow[];
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);

const cellV = (ws: WS, r: number, c: number): string | number | null => {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return null;
  return cell.v as string | number;
};
const cellF = (ws: WS, r: number, c: number): string | null => {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell?.f ? String(cell.f) : null;
};

function classifyQty(val: string | number | null, formula: string | null): { qtyFrom: string; defect: boolean } {
  if (formula) return { qtyFrom: `derived.${formula.replace(/\s+/g, '').slice(0, 60)}`, defect: false };
  if (typeof val === 'number') return { qtyFrom: `constant:${val}`, defect: false };
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    return { qtyFrom: Number.isNaN(n) ? 'user' : `constant:${n}`, defect: false };
  }
  return { qtyFrom: 'user', defect: true };
}

function extractCatalog(ws: WS, sourceTemplate: string): CatalogEntry[] {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const entries: CatalogEntry[] = [];
  let lastCategory = '';
  for (let r = 1; r <= range.e.r; r++) {
    const cat = cellV(ws, r, 0);
    const desc = cellV(ws, r, 1);
    const price = cellV(ws, r, 2);
    const unit = cellV(ws, r, 3);
    if (cat != null && String(cat).trim() !== '') lastCategory = String(cat).trim();
    if (desc == null || String(desc).trim() === '') continue;
    const description = String(desc).trim();
    if (/^description$/i.test(description)) continue;
    const numPrice = typeof price === 'number' ? price : Number(price);
    if (!Number.isFinite(numPrice) || numPrice <= 0) continue;
    entries.push({
      productId: slugify(`${lastCategory}-${description}`),
      description,
      unitPrice: Math.round(numPrice * 100) / 100,
      category: lastCategory || 'UNCATEGORIZED',
      unit: unit == null ? '' : String(unit).trim(),
      sourceTemplate,
    });
  }
  return entries;
}

function extractFormulas(ws: WS, spec: TemplateSpec): FormulaRow[] {
  const out: FormulaRow[] = [];
  const start = Math.max(spec.header + 1, 15);
  const end = Math.max(spec.header + 1, 60);
  for (let r1 = start; r1 <= end; r1++) {
    const r = r1 - 1;
    const desc = cellV(ws, r, spec.cols.desc);
    if (desc == null) continue;
    const description = String(desc).trim();
    if (description === '' || /^(DESCRIPTION|Subtotal|Tax|TOTAL)/i.test(description)) continue;
    const qtyV = cellV(ws, r, spec.cols.qty);
    const qtyF = cellF(ws, r, spec.cols.qty);
    const priceV = cellV(ws, r, spec.cols.price);
    const extV = cellV(ws, r, spec.cols.ext);
    const productCol = cellV(ws, r, spec.cols.product);
    const categoryGuess = productCol ? String(productCol).trim() : '';
    const { qtyFrom, defect } = classifyQty(qtyV, qtyF);
    out.push({
      row: r1,
      productId: slugify(`${categoryGuess}-${description}`),
      qtyFrom,
      defectInTemplate: defect,
      raw: {
        colE_qty: qtyF ? `=${qtyF}` : qtyV,
        colG_description: description,
        colK_or_L_price: priceV,
        colM_extended: extV,
        isBlankQty: defect,
      },
    });
  }
  return out;
}

function dedupeCatalog(all: CatalogEntry[]): CatalogEntry[] {
  const byId = new Map<string, CatalogEntry[]>();
  for (const e of all) {
    const list = byId.get(e.productId) ?? [];
    list.push(e);
    byId.set(e.productId, list);
  }
  const result: CatalogEntry[] = [];
  const conflicts: string[] = [];
  for (const [id, group] of byId) {
    const prices = Array.from(new Set(group.map((g) => g.unitPrice)));
    if (prices.length === 1) {
      result.push({ ...group[0] });
      continue;
    }
    conflicts.push(`${id}: prices=${prices.join(',')}`);
    for (const g of group) {
      result.push({ ...g, variant: g.sourceTemplate, productId: `${id}--${slugify(g.sourceTemplate)}` });
    }
  }
  if (conflicts.length > 0) {
    process.stderr.write(`[price-conflicts] ${conflicts.length}\n${conflicts.map((c) => '  ' + c).join('\n')}\n`);
  }
  result.sort((a, b) => a.productId.localeCompare(b.productId));
  return result;
}

function writeSorted(filePath: string, data: unknown): void {
  const sorted = JSON.stringify(
    data,
    (_k, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.keys(v as object)
            .sort()
            .reduce<Record<string, unknown>>((acc, k) => {
              acc[k] = (v as Record<string, unknown>)[k];
              return acc;
            }, {})
        : v,
    2,
  );
  fs.writeFileSync(filePath, sorted + '\n', 'utf8');
}

function main(): void {
  const repoRoot = path.resolve(__dirname, '..');
  const outDir = path.join(repoRoot, 'src/lib/estimate/data');
  fs.mkdirSync(outDir, { recursive: true });

  const allCatalog: CatalogEntry[] = [];
  const formulas: Record<string, JobTypeFormula> = {};
  const defectCounts: Record<string, number> = {};

  for (const spec of TEMPLATES) {
    const filePath = path.join(TEMPLATES_DIR, spec.file);
    if (!fs.existsSync(filePath)) {
      process.stderr.write(`[missing] ${spec.file}\n`);
      continue;
    }
    const wb = XLSX.readFile(filePath, { cellFormula: true, cellNF: false });
    const catalogSheet = wb.Sheets[CATALOG_SHEET];
    if (catalogSheet) allCatalog.push(...extractCatalog(catalogSheet, spec.id));
    else process.stderr.write(`[warn] ${spec.file} has no "${CATALOG_SHEET}" sheet\n`);
    const estimateName = wb.SheetNames.find((n) => n !== CATALOG_SHEET);
    const estimate = estimateName ? wb.Sheets[estimateName] : undefined;
    if (!estimate) {
      process.stderr.write(`[warn] ${spec.file} has no estimate sheet\n`);
      continue;
    }
    const lineItems = extractFormulas(estimate, spec);
    formulas[spec.id] = { templateSource: spec.file, lineItems };
    defectCounts[spec.id] = lineItems.filter((li) => li.defectInTemplate).length;
  }

  const catalog = dedupeCatalog(allCatalog);
  writeSorted(path.join(outDir, 'pricingCatalog.json'), catalog);
  writeSorted(path.join(outDir, 'jobTypeFormulas.json'), formulas);

  process.stdout.write(
    `[catalog] entries=${catalog.length}\n` +
      `[defects]\n${Object.entries(defectCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n')}\n` +
      `[output]\n  ${path.relative(repoRoot, path.join(outDir, 'pricingCatalog.json'))}\n` +
      `  ${path.relative(repoRoot, path.join(outDir, 'jobTypeFormulas.json'))}\n`,
  );
}

main();
