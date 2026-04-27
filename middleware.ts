import { NextRequest, NextResponse } from 'next/server';
import { getAppRole } from '@/lib/app-role';

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInternalPath(pathname)) {
    return NextResponse.next();
  }

  const appRole = getAppRole();

  if (appRole === 'verify') {
    if (VERIFY_PUBLIC_PATHS.includes(pathname) || isVerifyRecordPath(pathname)) {
      return NextResponse.next();
    }

    if (isBlockedVerifyPath(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

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

export const config = {
  matcher: ['/:path*'],
};
