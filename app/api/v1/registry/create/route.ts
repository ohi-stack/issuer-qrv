import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function isAuthorized(request: NextRequest): boolean {
  const expectedKey = process.env.QRV_API_KEY;
  const providedKey = request.headers.get('x-api-key');

  if (!expectedKey) return false;
  return providedKey === expectedKey;
}

function createHash(payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid JSON payload',
      },
      { status: 400 }
    );
  }

  const recordType = String(body.recordType || body.type || 'certificate');
  const issuer = String(body.issuer || 'QR-V™ — Global QR Verification Protocol');
  const owner = String(body.owner || body.subject || body.subjectName || '').trim();
  const description = String(body.description || '');
  const issueDate = String(body.issueDate || new Date().toISOString());
  const expirationDate = body.expirationDate ? String(body.expirationDate) : null;
  const privacyLevel = String(body.privacyLevel || 'public');

  if (!owner) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Owner / subject is required',
      },
      { status: 400 }
    );
  }

  const qrvid = `QRV-${Date.now()}`;

  const record = {
    qrvid,
    status: 'VERIFIED',
    recordType,
    issuer,
    owner,
    description,
    issueDate,
    expirationDate,
    privacyLevel,
    createdAt: new Date().toISOString(),
  };

  const hash = createHash(record);

  return NextResponse.json({
    ok: true,
    status: 'VERIFIED',
    qrvid,
    id: qrvid,
    hash,
    verifyUrl: `https://verify.qrv.network/${qrvid}`,
    record: {
      ...record,
      hash,
    },
  });
}
