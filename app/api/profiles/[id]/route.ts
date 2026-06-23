import { NextResponse } from 'next/server';

import { getProfile } from '@/lib/profile-store';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await getProfile(id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error('[GET /api/profiles/:id]', error);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
