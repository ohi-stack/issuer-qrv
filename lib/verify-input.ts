export const QRVID_PATTERN = /^QRV-[A-Z0-9-]+$/;

export type NormalizeResult =
  | { ok: true; qrvid: string }
  | { ok: false; reason: 'INVALID_FORMAT' };

function sanitize(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

function normalizeFromQrvUrl(input: string): string | null {
  if (!input.toUpperCase().startsWith('QRV://')) {
    return null;
  }

  const rawValue = input.slice(6).trim();
  if (!rawValue) return null;
  return rawValue.toUpperCase();
}

function normalizeFromHttpsUrl(input: string): string | null {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname !== 'verify.qrv.network') return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const candidate = decodeURIComponent(segments[segments.length - 1] || '').toUpperCase();
    return candidate || null;
  } catch {
    return null;
  }
}

export function normalizeQrvidInput(rawInput: string): NormalizeResult {
  const input = sanitize(rawInput);
  if (!input) return { ok: false, reason: 'INVALID_FORMAT' };

  const direct = input.toUpperCase();
  const fromQrvUrl = normalizeFromQrvUrl(input);
  const fromHttpsUrl = normalizeFromHttpsUrl(input);

  const candidate = fromQrvUrl || fromHttpsUrl || direct;

  if (!QRVID_PATTERN.test(candidate)) {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }

  return { ok: true, qrvid: candidate };
}
