import { NextRequest, NextResponse } from 'next/server';
import { getAppRole } from '@/lib/app-role';

const ISSUER_PUBLIC_PATHS = ['/login', '/healthz', '/readyz', '/version'];

function isNextInternalPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  );
}

function isVerifyRecordPath(pathname: string): boolean {
  if (!pathname.startsWith('/')) {
    return false;
  }

  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 1;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const appRole = getAppRole();

  if (isNextInternalPath(pathname)) {
    return NextResponse.next();
  }

  if (appRole === 'verify') {
    if (pathname === '/' || pathname === '/healthz' || pathname === '/readyz' || pathname === '/version' || isVerifyRecordPath(pathname)) {
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
