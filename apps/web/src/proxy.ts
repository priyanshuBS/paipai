import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIES = ['paipai.session_token', '__Secure-paipai.session_token'];

/**
 * Optimistic auth check: send visitors without a session cookie to /login.
 * The API still verifies every request; this only avoids a flash of the app.
 */
export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((n) => request.cookies.has(n));
  if (!hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/app'],
};
