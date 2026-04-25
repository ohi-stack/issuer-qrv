import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/healthz', '/readyz', '/version'];
const VERIFY_BLOCKED_PATHS = ['/dashboard', '/certificates', '/api-keys', '/settings'];

function isStaticPath(pathname: string): boolean {
  return pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.');
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api') || isStaticPath(pathname);
}

function isIssuerOnlyPath(pathname: string): boolean {
  return VERIFY_BLOCKED_PATHS.some((basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = process.env.NEXT_PUBLIC_APP_ROLE === 'verify' ? 'verify' : 'issuer';

  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  if (role === 'verify') {
    if (isIssuerOnlyPath(pathname)) {
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
