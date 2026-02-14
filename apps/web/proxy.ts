import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'refreshToken';

export function proxy(req: NextRequest) {
  const hasRefreshToken = req.cookies.has(COOKIE_NAME);
  const { pathname } = req.nextUrl;

  // Soft guard: checks cookie presence only, not validity.
  // Real auth verification happens when the page calls /api/auth/refresh.
  if (pathname.startsWith('/dashboard') && !hasRefreshToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Public pages: redirect to dashboard if already logged in
  if ((pathname === '/' || pathname === '/login' || pathname === '/register') && hasRefreshToken) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/register'],
};
