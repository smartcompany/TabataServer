import { NextResponse } from 'next/server';

import { listProfileSummaries } from '@/lib/profile-store';

export async function GET() {
  try {
    const profiles = await listProfileSummaries();
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
