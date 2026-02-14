import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

// Server-only env var — never exposed to the browser (no NEXT_PUBLIC_ prefix)
const API_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000/api/v1';

const COOKIE_NAME = 'refreshToken';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

function errorResponse(message: string, status = 500) {
  return NextResponse.json(
    { success: false, data: null, error: message },
    { status },
  );
}

async function forwardToBackend(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}

async function handleAuthAction(req: NextRequest, backendPath: string) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid request body', 400);
  }

  let res: Response;
  let data: Record<string, unknown>;
  try {
    ({ res, data } = await forwardToBackend(backendPath, body));
  } catch {
    return errorResponse('Unable to connect to the server. Please try again later.', 502);
  }

  // Backend errors (validation, duplicate email, etc.) — forward as-is with meaningful message
  if (!res.ok || !data.success) {
    return NextResponse.json(data, { status: res.status });
  }

  const { refreshToken, ...tokens } = (data.data as { tokens: { refreshToken: string } }).tokens;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, refreshToken, cookieOptions());

  return NextResponse.json({
    success: true as const,
    data: { user: (data.data as { user: unknown }).user, tokens },
    error: null,
  });
}

async function handleRefresh() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_NAME)?.value;

  if (!refreshToken) {
    return errorResponse('No refresh token', 401);
  }

  let res: Response;
  let data: Record<string, unknown>;
  try {
    ({ res, data } = await forwardToBackend('/auth/refresh', { refreshToken }));
  } catch {
    return errorResponse('Unable to connect to the server. Please try again later.', 502);
  }

  if (!res.ok || !data.success) {
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json(data, { status: res.status });
  }

  const { refreshToken: newRefreshToken, ...tokens } = data.data as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  cookieStore.set(COOKIE_NAME, newRefreshToken, cookieOptions());

  return NextResponse.json({
    success: true as const,
    data: tokens,
    error: null,
  });
}

async function handleLogout(req: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_NAME)?.value;
  const authHeader = req.headers.get('Authorization');

  if (refreshToken && authHeader) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Best-effort: clear cookie even if backend call fails
    }
  }

  cookieStore.delete(COOKIE_NAME);

  return NextResponse.json({
    success: true as const,
    data: null,
    error: null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const route = path.join('/');

    switch (route) {
      case 'login':
        return await handleAuthAction(req, '/auth/login');
      case 'register':
        return await handleAuthAction(req, '/auth/register');
      case 'refresh':
        return await handleRefresh();
      case 'logout':
        return await handleLogout(req);
      default:
        return errorResponse('Not found', 404);
    }
  } catch (err) {
    // Unexpected BFF error (code bug, not a backend validation error).
    // Backend errors are forwarded with their original message above.
    console.error('[BFF auth]', err);
    return errorResponse('Something went wrong');
  }
}
