describe('getAppRole', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('defaults to issuer when env is unset', async () => {
    const { getAppRole } = await import('@/lib/app-role');
    expect(getAppRole()).toBe('issuer');
  });

  it('returns verify role when env is verify', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ROLE', 'verify');
    const { getAppRole } = await import('@/lib/app-role');
    expect(getAppRole()).toBe('verify');
  });

  it('falls back to issuer for unsupported values', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ROLE', 'api');
    const { getAppRole } = await import('@/lib/app-role');
    expect(getAppRole()).toBe('issuer');
  });
});
