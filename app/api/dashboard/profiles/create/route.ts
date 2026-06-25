import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { verifyDashboardRequest } from '@/lib/dashboard-auth';
import { jsonResponse, optionsResponse } from '@/lib/http';
import { parseRoutineProfile, OFFICIAL_CATALOG_OWNER } from '@/lib/profile-schema';
import { saveProfile } from '@/lib/profile-store';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  if (!verifyDashboardRequest(request)) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const profile = parseRoutineProfile(body);
    const summary = await saveProfile(profile, {
      ownerId: OFFICIAL_CATALOG_OWNER,
    });
    return jsonResponse(request, { summary, profile }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        request,
        { error: 'Invalid profile JSON', details: error.flatten() },
        { status: 400 },
      );
    }
    console.error('[POST /api/dashboard/profiles]', error);
    return jsonResponse(
      request,
      { error: error instanceof Error ? error.message : 'Failed to create profile' },
      { status: 500 },
    );
  }
}
