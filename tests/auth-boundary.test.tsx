import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthBoundary } from '@/components/auth/AuthBoundary';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/dashboard'
}));

describe('AuthBoundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    document.cookie = 'qrv_issuer_session=; Max-Age=0; path=/';
  });

  it('redirects to login in production without session cookie', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    render(<AuthBoundary><div>Private</div></AuthBoundary>);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login?next=%2Fdashboard');
    });
  });

  it('renders children when session cookie exists', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    document.cookie = 'qrv_issuer_session=1; path=/';

    render(<AuthBoundary><div>Private</div></AuthBoundary>);

    await waitFor(() => {
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });
});
