import { NextRequest } from 'next/server';

import {
  createDashboardToken,
  getDashboardCookieConfig,
} from '@/lib/dashboard-auth';
import { jsonResponse, optionsResponse } from '@/lib/http';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = body.username ?? '';
    const password = body.password ?? '';

    const expectedUser = process.env.DASHBOARD_USERNAME || '';
    const expectedPass = process.env.DASHBOARD_PASSWORD || '';

    if (!expectedUser || !expectedPass) {
      return jsonResponse(
        request,
        { error: 'Dashboard login not configured' },
        { status: 503 },
      );
    }

    if (username !== expectedUser || password !== expectedPass) {
      return jsonResponse(
        request,
        { error: 'Invalid username or password' },
        { status: 401 },
      );
    }

    const token = createDashboardToken();
    const { name, options } = getDashboardCookieConfig();
    const res = jsonResponse(request, { ok: true });
    res.cookies.set(name, token, options);
    return res;
  } catch (error) {
    console.error('[dashboard login]', error);
    return jsonResponse(request, { error: 'Login failed' }, { status: 500 });
  }
}
