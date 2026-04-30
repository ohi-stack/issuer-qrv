import { NextRequest, NextResponse } from 'next/server';

const ISSUER_PUBLIC_PATHS = ['/login', '/healthz', '/readyz', '/version'];
const VERIFY_PUBLIC_PATHS = ['/', '/scan', '/help', '/api-status', '/healthz', '/readyz', '/version'];
const VERIFY_BLOCKED_PREFIXES = [
  '/dashboard',
  '/certificates',
  '/api-keys',
  '/settings',
  '/onboarding',
  '/analytics',
  '/revocations',
];

const ISSUER_HOSTS = new Set(['issuer.qrv.network']);
const VERIFY_HOSTS = new Set(['verify.qrv.network']);
const BACKEND_ONLY_HOSTS = new Set(['api.qrv.network', 'registry.qrv.network']);

function isInternalPath(pathname: string): boolean {
  return pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon') || pathname.includes('.');
}

function isVerifyRecordPath(pathname: string): boolean {
  if (pathname.startsWith('/verify/')) {
    return true;
  }

  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 1 && segments[0].toUpperCase().startsWith('QRV-');
}

function isBlockedVerifyPath(pathname: string): boolean {
  return VERIFY_BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getHost(request: NextRequest): string {
  return request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase() ?? request.nextUrl.hostname.toLowerCase();
}

function isBackendStatusPath(pathname: string): boolean {
  return pathname === '/healthz' || pathname === '/readyz' || pathname === '/version';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInternalPath(pathname)) {
    return NextResponse.next();
  }

  const host = getHost(request);

  if (BACKEND_ONLY_HOSTS.has(host)) {
    if (isBackendStatusPath(pathname)) {
      return NextResponse.next();
    }

    return NextResponse.json(
      {
        error: 'Not Found',
        message: `${host} is a backend-only domain.`,
      },
      { status: 404 },
    );
  }

  if (VERIFY_HOSTS.has(host)) {
    if (VERIFY_PUBLIC_PATHS.includes(pathname) || isVerifyRecordPath(pathname)) {
      return NextResponse.next();
    }

    if (isBlockedVerifyPath(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

  if (ISSUER_HOSTS.has(host)) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (ISSUER_PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    const session = request.cookies.get('qrv_issuer_session')?.value;
    if (session === '1') {
      return NextResponse.next();
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.json(
    {
      error: 'Not Found',
      message: `Unrecognized host ${host}.`,
    },
    { status: 404 },
  );
}

export const config = {
  matcher: ['/:path*'],
};
