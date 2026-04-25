import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchVerification } from '@/lib/verification';

describe('fetchVerification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes unsupported statuses to NOT_FOUND', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ERROR', qrvid: 'QRV-1' })
      })
    );

    const result = await fetchVerification('QRV-1');
    expect(result.status).toBe('NOT_FOUND');
  });

  it('maps issuer/title/subject and proof fields from API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'VERIFIED',
          issuer: 'QRV Academy',
          title: 'Pilot Credential',
          recipientName: 'Recipient Hidden',
          issueDate: '2026-04-25T00:00:00.000Z',
          proof_reference: 'abc123',
          qrvid: 'QRV-2'
        })
      })
    );

    const result = await fetchVerification('QRV-2');
    expect(result.status).toBe('VERIFIED');
    expect(result.issuerName).toBe('QRV Academy');
    expect(result.credentialTitle).toBe('Pilot Credential');
    expect(result.subjectDisplay).toBe('Recipient Hidden');
    expect(result.proofReference).toBe('abc123');
  });
});
