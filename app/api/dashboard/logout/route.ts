import { NextRequest } from 'next/server';

import { getDashboardCookieConfig } from '@/lib/dashboard-auth';
import { jsonResponse, optionsResponse } from '@/lib/http';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  const { name, options } = getDashboardCookieConfig();
  const res = jsonResponse(request, { ok: true });
  res.cookies.set(name, '', { ...options, maxAge: 0 });
  return res;
}
