import { NextRequest, NextResponse } from 'next/server';
import { getAppRole } from '@/lib/app-role';

const ISSUER_PUBLIC_PATHS = ['/login', '/healthz', '/readyz', '/version'];

function isInternalPath(pathname: string): boolean {
  return pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.') || pathname.startsWith('/favicon');
}

function isVerifyPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/scan' || pathname === '/help' || pathname === '/api-status') {
    return true;
  }

  if (pathname === '/healthz' || pathname === '/readyz' || pathname === '/version') {
    return true;
  }

  if (pathname.startsWith('/verify/')) {
    return true;
  }

  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 1;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInternalPath(pathname)) {
    return NextResponse.next();
  }

  const appRole = getAppRole();

  if (appRole === 'verify') {
    if (isVerifyPublicPath(pathname)) {
      return NextResponse.next();
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
