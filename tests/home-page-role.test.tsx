import { render, screen } from '@testing-library/react';
import React from 'react';

const redirectMock = vi.fn((url: string) => {
  throw new Error('NEXT_REDIRECT');
});

vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

describe('home page role routing', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    redirectMock.mockClear();
  });

  it('redirects issuer role home route to /login', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ROLE', 'issuer');
    const { default: HomePage } = await import('@/app/page');

    expect(() => HomePage()).toThrow('NEXT_REDIRECT');
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('renders verification landing for verify role', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ROLE', 'verify');
    const { default: HomePage } = await import('@/app/page');

    render(HomePage());

    expect(screen.getByText('Verify Any QR-V™ Record Instantly')).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
