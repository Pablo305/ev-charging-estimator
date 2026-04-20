import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin, isSupabaseAvailable } from '@/lib/supabase';
import type { EstimateOutput } from '@/lib/estimate/types';

const DEMO_SALES_REP_ID = '8cd67985-0bb2-4daf-8824-8ade23dcfa27';

/**
 * Persists an estimate for customer-facing sharing.
 *
 * Writes a customers -> projects -> estimates row chain using service-role
 * access (bypasses RLS). Returns the public /proposal/{viewToken} URL that
 * the sales rep can forward to the customer — the UUID token is the auth
 * for that route, no login required.
 *
 * Contract:
 *   POST { output: EstimateOutput }
 *   -> 200 { url: '/proposal/<uuid>', token, estimateId }
 */
export async function POST(request: Request) {
  if (!isSupabaseAvailable() || !supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deployment' },
      { status: 503 },
    );
  }
  const admin = supabaseAdmin;

  let body: { output?: EstimateOutput };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const output = body.output;
  if (!output || !output.input || !Array.isArray(output.lineItems) || !output.summary) {
    return NextResponse.json(
      { error: 'Body must include { output: EstimateOutput }' },
      { status: 400 },
    );
  }

  const input = output.input;
  const companyName =
    input.customer?.companyName?.trim() || input.project?.name?.trim() || 'Unnamed Customer';
  const projectName = input.project?.name?.trim() || companyName;
  const viewToken = randomUUID();
  const customerId = randomUUID();
  const projectId = randomUUID();
  const estimateId = randomUUID();

  const { error: customerErr } = // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('customers').insert({
    id: customerId,
    sales_rep_id: DEMO_SALES_REP_ID,
    company_name: companyName,
    contact_name: input.customer?.contactName || null,
    contact_email: input.customer?.contactEmail || null,
    contact_phone: input.customer?.contactPhone || null,
    billing_address: input.customer?.billingAddress || null,
  });
  if (customerErr) {
    return NextResponse.json(
      { error: `Failed to create customer: ${customerErr.message}` },
      { status: 500 },
    );
  }

  const { error: projectErr } = // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('projects').insert({
    id: projectId,
    customer_id: customerId,
    sales_rep_id: DEMO_SALES_REP_ID,
    name: projectName,
    address: input.site?.address || null,
    state: input.site?.state || null,
    status: 'active',
  });
  if (projectErr) {
    return NextResponse.json(
      { error: `Failed to create project: ${projectErr.message}` },
      { status: 500 },
    );
  }

  const { error: estimateErr } = // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('estimates').insert({
    id: estimateId,
    project_id: projectId,
    version_number: 1,
    input_json: input,
    output_json: output,
    schema_version: '1.0.0',
    status: 'sent',
    customer_view_token: viewToken,
    sales_rep_id: DEMO_SALES_REP_ID,
  });
  if (estimateErr) {
    return NextResponse.json(
      { error: `Failed to create estimate: ${estimateErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: `/proposal/${viewToken}`,
    token: viewToken,
    estimateId,
    projectId,
    customerId,
  });
}
