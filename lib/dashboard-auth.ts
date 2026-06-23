import { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';

const COOKIE_NAME = 'dashboard_token';
const DEV_FALLBACK_SECRET = 'dashboard-dev-secret-local-only';

const WEAK_SECRETS = new Set([
  DEV_FALLBACK_SECRET,
  'change-me-to-a-long-random-string',
]);

function resolveDashboardSecret(): string {
  const secret = process.env.DASHBOARD_SECRET?.trim() ?? '';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || WEAK_SECRETS.has(secret) || secret.length < 32) {
      throw new Error(
        'DASHBOARD_SECRET must be set to a strong random value (32+ chars) in production',
      );
    }
    return secret;
  }

  if (secret && !WEAK_SECRETS.has(secret)) {
    return secret;
  }

  return DEV_FALLBACK_SECRET;
}

export type DashboardPayload = { dashboard: true };

export function createDashboardToken(): string {
  return jwt.sign({ dashboard: true } as DashboardPayload, resolveDashboardSecret(), {
    expiresIn: '24h',
  });
}

export function verifyDashboardToken(token: string): DashboardPayload | null {
  try {
    const decoded = jwt.verify(token, resolveDashboardSecret()) as DashboardPayload;
    return decoded?.dashboard ? decoded : null;
  } catch {
    return null;
  }
}

export function getDashboardToken(request: NextRequest): string | null {
  const cookie = request.cookies.get(COOKIE_NAME);
  return cookie?.value ?? null;
}

export function verifyDashboardRequest(request: NextRequest): boolean {
  const token = getDashboardToken(request);
  if (!token) return false;
  return verifyDashboardToken(token) !== null;
}

export function getDashboardCookieConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24,
      path: '/',
    },
  };
}
