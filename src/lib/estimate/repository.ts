import { randomBytes } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SharedEstimateRecord, SharedEstimateStatus } from './shared-types';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_STORE = path.join(DATA_DIR, 'shared-estimates.json');

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function generateShareId(): string {
  return randomBytes(16).toString('base64url');
}

async function readFileStore(): Promise<Record<string, SharedEstimateRecord>> {
  try {
    const raw = await readFile(FILE_STORE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, SharedEstimateRecord>;
    }
  } catch {
    // missing file
  }
  return {};
}

async function writeFileStore(store: Record<string, SharedEstimateRecord>): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_STORE, JSON.stringify(store, null, 2), 'utf-8');
}

export async function createSharedEstimate(params: {
  output: SharedEstimateRecord['output'];
  previewAssets?: SharedEstimateRecord['previewAssets'];
  status?: SharedEstimateStatus;
  id?: string;
}): Promise<SharedEstimateRecord> {
  const now = new Date().toISOString();
  const id = params.id ?? generateShareId();
  const record: SharedEstimateRecord = {
    id,
    createdAt: now,
    updatedAt: now,
    status: params.status ?? 'public',
    output: params.output,
    previewAssets: params.previewAssets,
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('shared_estimates').upsert({
      id: record.id,
      payload: record as unknown as Record<string, unknown>,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    });
    if (error) throw new Error(`Supabase save failed: ${error.message}`);
    return record;
  }

  const store = await readFileStore();
  store[record.id] = record;
  await writeFileStore(store);
  return record;
}

export async function getSharedEstimate(id: string): Promise<SharedEstimateRecord | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('shared_estimates')
      .select('payload')
      .eq('id', id)
      .maybeSingle();
    if (error || !data?.payload) return null;
    const rec = data.payload as SharedEstimateRecord;
    if (rec.status === 'revoked') return null;
    return rec;
  }

  const store = await readFileStore();
  const rec = store[id];
  if (!rec || rec.status === 'revoked') return null;
  return rec;
}

export async function revokeSharedEstimate(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('shared_estimates')
      .select('payload')
      .eq('id', id)
      .maybeSingle();
    if (error || !data?.payload) return false;
    const rec = data.payload as SharedEstimateRecord;
    if (rec.status === 'revoked') return true;
    const updated: SharedEstimateRecord = {
      ...rec,
      status: 'revoked',
      updatedAt: new Date().toISOString(),
    };
    const { error: upErr } = await supabase.from('shared_estimates').upsert({
      id,
      updated_at: updated.updatedAt,
      payload: updated as unknown as Record<string, unknown>,
    });
    return !upErr;
  }

  const store = await readFileStore();
  const rec = store[id];
  if (!rec) return false;
  rec.status = 'revoked';
  rec.updatedAt = new Date().toISOString();
  store[id] = rec;
  await writeFileStore(store);
  return true;
}
