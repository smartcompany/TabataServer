import { NextRequest } from 'next/server';

import { verifyToken } from '@/lib/middleware/auth';
import { jsonResponse, optionsResponse } from '@/lib/http';
import { listProfilesForOwner } from '@/lib/profile-store';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  const authUser = await verifyToken(request);
  if (!authUser) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profiles = await listProfilesForOwner(authUser.firebaseUid);
    return jsonResponse(request, { profiles });
  } catch (error) {
    console.error('[GET /api/user/profiles]', error);
    return jsonResponse(
      request,
      { error: 'Failed to list profiles' },
      { status: 500 },
    );
  }
}
