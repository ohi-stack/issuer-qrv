import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchVerification } from '@/lib/verification';

describe('fetchVerification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes unsupported statuses to UNAVAILABLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ERROR', qrvid: 'QRV-1' }),
      }),
    );

    const result = await fetchVerification('QRV-1');
    expect(result.status).toBe('UNAVAILABLE');
  });

  it('maps public fields from API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'VERIFIED',
          issuer: 'QRV Academy',
          recordType: 'Certificate',
          subject: 'Recipient Hidden',
          issuedAt: '2026-04-25T00:00:00.000Z',
          hash: 'abc123',
          qrvid: 'QRV-2',
        }),
      }),
    );

    const result = await fetchVerification('QRV-2');
    expect(result.status).toBe('VERIFIED');
    expect(result.issuer).toBe('QRV Academy');
    expect(result.recordType).toBe('Certificate');
    expect(result.subject).toBe('Recipient Hidden');
    expect(result.hash).toBe('abc123');
  });
});
