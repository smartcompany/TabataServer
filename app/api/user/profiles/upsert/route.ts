import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { verifyToken } from '@/lib/middleware/auth';
import { jsonResponse, optionsResponse } from '@/lib/http';
import { parseRoutineProfile } from '@/lib/profile-schema';
import {
  getProfileOwnerId,
  profileExists,
  saveProfile,
} from '@/lib/profile-store';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  const authUser = await verifyToken(request);
  if (!authUser) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const profile = parseRoutineProfile(body);
    const existed = await profileExists(profile.id);
    if (existed) {
      const ownerId = await getProfileOwnerId(profile.id);
      if (ownerId !== authUser.firebaseUid) {
        return jsonResponse(
          request,
          { error: 'Profile id already in use' },
          { status: 409 },
        );
      }
    }

    const summary = await saveProfile(profile, {
      ownerId: authUser.firebaseUid,
    });

    return jsonResponse(
      request,
      {
        summary,
        profile,
        action: existed ? 'updated' : 'created',
      },
      { status: existed ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        request,
        { error: 'Invalid profile JSON', details: error.flatten() },
        { status: 400 },
      );
    }
    console.error('[POST /api/user/profiles/upsert]', error);
    return jsonResponse(
      request,
      {
        error: error instanceof Error ? error.message : 'Failed to upsert profile',
      },
      { status: 500 },
    );
  }
}
