import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { pickStoreUrl } from '@/lib/applink';

/**
 * `/applink` — UA 기준 App Store / Play Store 302.
 * X·카카오 등 인앱 WebView는 `/applink/social` (HTML + 버튼) 사용.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/applink') {
    const ua = request.headers.get('user-agent') ?? '';
    return NextResponse.redirect(pickStoreUrl(ua), 302);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/applink'],
};
