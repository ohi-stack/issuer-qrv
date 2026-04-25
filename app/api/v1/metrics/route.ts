import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'qrv-api',
    status: 'online',
    totalRecords: 0,
    verified: 0,
    revoked: 0,
    scans24h: 0,
    timestamp: new Date().toISOString(),
  });
}
