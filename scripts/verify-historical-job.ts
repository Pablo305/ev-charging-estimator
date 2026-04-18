#!/usr/bin/env node
/**
 * Historical job verifier — on-demand CLI.
 *
 * Use this when you want to validate that the estimator produces the right
 * total for a real historical job. No cron, no GH Action — run it locally
 * whenever you want to spot-check accuracy.
 *
 * Usage:
 *   npx tsx scripts/verify-historical-job.ts <fixture-path>
 *   npx tsx scripts/verify-historical-job.ts --all
 *   npm run verify:historical -- tests/fixtures/proposal-hampton-inn.json
 *   npm run verify:historical -- --all
 *
 * Drop-in a new fixture format (JSON):
 *   {
 *     "proposalName": "Shorthand for reporting",
 *     "sourceFile": "optional filename/source URL",
 *     "totalFromProposal": 98975,
 *     "estimateInput": { ...EstimateInput... },
 *     "expectedLineItems": [{ category, description, qty, unitPrice, amount }, ...]
 *   }
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEstimate } from '../src/lib/estimate/engine';
import { matchDescription } from '../src/lib/estimate/description-normalizer';
import type { EstimateInput } from '../src/lib/estimate/types';

interface ProposalFixture {
  proposalName: string;
  sourceFile?: string;
  totalFromProposal: number;
  estimateInput: Record<string, unknown>;
  expectedLineItems: Array<{
    category: string;
    description: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
}

interface Report {
  name: string;
  proposalTotal: number;
  engineTotal: number;
  deltaPct: number;
  coveragePct: number;
  matched: number;
  totalExpected: number;
  missing: string[];
  qtyMismatches: Array<{ description: string; expected: number; got: number }>;
  priceMismatches: Array<{ description: string; expected: number; got: number }>;
  pass: boolean;
}

const DEFAULT_TOLERANCE_PCT = 10; // ±10% accepted; tighten per fixture if desired.

function verify(fixture: ProposalFixture): Report {
  const output = generateEstimate(fixture.estimateInput as unknown as EstimateInput);
  const engineTotal = output.summary.total;
  const proposalTotal = fixture.totalFromProposal;
  const deltaPct = proposalTotal === 0
    ? 0
    : ((engineTotal - proposalTotal) / proposalTotal) * 100;

  const expected = fixture.expectedLineItems.filter((l) => l.amount > 0 || l.unitPrice > 0);
  const missing: string[] = [];
  const qtyMismatches: Report['qtyMismatches'] = [];
  const priceMismatches: Report['priceMismatches'] = [];
  let matched = 0;

  for (const e of expected) {
    const m = output.lineItems.find((li) => matchDescription(li.description, e.description));
    if (!m) {
      missing.push(e.description);
      continue;
    }
    matched++;
    if (m.quantity !== e.qty) {
      qtyMismatches.push({ description: e.description, expected: e.qty, got: m.quantity });
    }
    if (e.unitPrice > 0) {
      const tol = e.unitPrice * 0.05;
      if (Math.abs(m.unitPrice - e.unitPrice) > tol) {
        priceMismatches.push({ description: e.description, expected: e.unitPrice, got: m.unitPrice });
      }
    }
  }

  const coveragePct = expected.length === 0 ? 100 : (matched / expected.length) * 100;
  const pass = Math.abs(deltaPct) <= DEFAULT_TOLERANCE_PCT && coveragePct >= 80;

  return {
    name: fixture.proposalName,
    proposalTotal,
    engineTotal,
    deltaPct,
    coveragePct,
    matched,
    totalExpected: expected.length,
    missing,
    qtyMismatches,
    priceMismatches,
    pass,
  };
}

function printReport(r: Report): void {
  const bar = '─'.repeat(68);
  const verdict = r.pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  const delta = r.deltaPct >= 0 ? `+${r.deltaPct.toFixed(1)}%` : `${r.deltaPct.toFixed(1)}%`;

  console.log(bar);
  console.log(`${verdict}  ${r.name}`);
  console.log(bar);
  console.log(`  Proposal total : $${r.proposalTotal.toLocaleString()}`);
  console.log(`  Engine total   : $${r.engineTotal.toLocaleString()}`);
  console.log(`  Delta          : ${delta}  (tolerance ±${DEFAULT_TOLERANCE_PCT}%)`);
  console.log(`  Coverage       : ${r.coveragePct.toFixed(0)}%  (${r.matched}/${r.totalExpected} line items)`);
  if (r.missing.length > 0) {
    console.log(`  Missing (${r.missing.length}):`);
    for (const m of r.missing.slice(0, 5)) console.log(`    - ${m}`);
    if (r.missing.length > 5) console.log(`    ... +${r.missing.length - 5} more`);
  }
  if (r.qtyMismatches.length > 0) {
    console.log(`  Quantity mismatches (${r.qtyMismatches.length}):`);
    for (const q of r.qtyMismatches.slice(0, 5)) {
      console.log(`    ${q.description}: expected ${q.expected}, got ${q.got}`);
    }
  }
  if (r.priceMismatches.length > 0) {
    console.log(`  Price mismatches (${r.priceMismatches.length}):`);
    for (const p of r.priceMismatches.slice(0, 5)) {
      console.log(`    ${p.description}: expected $${p.expected}, got $${p.got}`);
    }
  }
}

function loadFixture(filePath: string): ProposalFixture {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw) as ProposalFixture;
  if (!data.proposalName || typeof data.totalFromProposal !== 'number') {
    throw new Error(`Invalid fixture shape at ${filePath}: missing proposalName or totalFromProposal`);
  }
  return data;
}

function loadAllFixtures(): ProposalFixture[] {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.join(__dirname, '..', 'tests', 'fixtures');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
  return files.map((f) => loadFixture(path.join(dir, f)));
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage:');
    console.error('  npm run verify:historical -- <fixture.json>');
    console.error('  npm run verify:historical -- --all');
    process.exit(2);
  }

  const fixtures: ProposalFixture[] = args[0] === '--all'
    ? loadAllFixtures()
    : args.map((a) => loadFixture(path.resolve(a)));

  const reports = fixtures.map(verify);
  for (const r of reports) printReport(r);

  const summary = reports.reduce(
    (acc, r) => {
      acc.passed += r.pass ? 1 : 0;
      acc.failed += r.pass ? 0 : 1;
      return acc;
    },
    { passed: 0, failed: 0 },
  );

  console.log('═'.repeat(68));
  console.log(`Summary: ${summary.passed} passed, ${summary.failed} failed`);
  console.log('═'.repeat(68));

  if (summary.failed > 0) process.exit(1);
}

main();
