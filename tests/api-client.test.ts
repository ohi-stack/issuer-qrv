function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('lib/api client wrappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls GET /health', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    const { api } = await import('@/lib/api');
    await api.getHealth();

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/health$/);
  });

  it('calls issuer and certificate endpoints', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.resetModules();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 'iss-1', name: 'Issuer' }))
      .mockResolvedValueOnce(jsonResponse([{ id: 'c1', qrvid: 'Q1', status: 'VERIFIED' }]))
      .mockResolvedValueOnce(jsonResponse({ id: 'c2', qrvid: 'Q2', status: 'VERIFIED' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'c2', qrvid: 'Q2', status: 'VERIFIED' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'c2', qrvid: 'Q2', status: 'REVOKED' }))
      .mockResolvedValueOnce(jsonResponse([{ id: 'a1', action: 'CERTIFICATE_ISSUED' }]));

    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/lib/api');

    await api.getIssuerMe();
    await api.getCertificates();
    await api.postCertificate({
      certificateTitle: 'Cert',
      issueDate: new Date().toISOString(),
      recipientName: 'Jane',
      privacyLevel: 'PUBLIC'
    });
    await api.getCertificate('Q2');
    await api.revokeCertificate('Q2', 'Issued in error');
    await api.getAuditLogs();

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/issuer\/me$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/certificates$/);
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/certificates$/);
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(fetchMock.mock.calls[3][0]).toMatch(/\/certificates\/Q2$/);
    expect(fetchMock.mock.calls[4][0]).toMatch(/\/certificates\/Q2\/revoke$/);
    expect(fetchMock.mock.calls[4][1]).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(fetchMock.mock.calls[5][0]).toMatch(/\/audit-logs$/);
  });

  it('allows mock fallback only in development', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    let mod = await import('@/lib/api');
    await expect(mod.api.getCertificates()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ status: 'VERIFIED' })]));

    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    mod = await import('@/lib/api');
    await expect(mod.api.getCertificates()).rejects.toThrow('offline');
  });
});
