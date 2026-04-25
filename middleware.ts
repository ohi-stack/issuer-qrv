import { NextRequest, NextResponse } from 'next/server';
import { getAppRole } from '@/lib/app-role';

const PUBLIC_PATHS = ['/', '/login', '/healthz', '/readyz', '/version'];
const VERIFY_BLOCKED_PATHS = ['/dashboard', '/certificates', '/api-keys', '/settings', '/login'];

function isStaticPath(pathname: string): boolean {
  return pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.');
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api') || isStaticPath(pathname);
}

function isIssuerOnlyPath(pathname: string): boolean {
  return VERIFY_BLOCKED_PATHS.some((basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`));
}

function isVerifyPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname === '/healthz' || pathname === '/readyz' || pathname === '/version') return true;
  if (pathname.startsWith('/api')) return true;

  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 1;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = getAppRole();

  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  if (role === 'verify') {
    if (isIssuerOnlyPath(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (!isVerifyPublicPath(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get('qrv_issuer_session')?.value;

  if (!session || session !== '1') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
