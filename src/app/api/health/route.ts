import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'BulletEV Estimate Generator',
    version: '0.1.0-prototype',
    timestamp: new Date().toISOString(),
    mode: 'offline',
  });
}
