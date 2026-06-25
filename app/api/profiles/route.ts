import { NextResponse } from 'next/server';

import {
  listProfileSummaries,
  type ProfileCatalogScope,
} from '@/lib/profile-store';

function parseScope(value: string | null): ProfileCatalogScope {
  return value === 'shared' ? 'shared' : 'official';
}

export async function GET(request: Request) {
  try {
    const scope = parseScope(new URL(request.url).searchParams.get('scope'));
    const profiles = await listProfileSummaries(scope);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('[GET /api/profiles]', error);
    return NextResponse.json(
      { error: 'Failed to list profiles' },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
