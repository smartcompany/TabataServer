import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { verifyDashboardRequest } from '@/lib/dashboard-auth';
import { jsonResponse, optionsResponse } from '@/lib/http';
import { parseRoutineProfile, OFFICIAL_CATALOG_OWNER } from '@/lib/profile-schema';
import { deleteProfile, getProfile, saveProfile } from '@/lib/profile-store';

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!verifyDashboardRequest(request)) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const profile = await getProfile(id);
    if (!profile) {
      return jsonResponse(request, { error: 'Profile not found' }, { status: 404 });
    }
    return jsonResponse(request, { profile });
  } catch (error) {
    console.error('[GET /api/dashboard/profiles/:id]', error);
    return jsonResponse(
      request,
      { error: 'Failed to load profile' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  if (!verifyDashboardRequest(request)) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const profile = parseRoutineProfile(body);
    if (profile.id !== id) {
      return jsonResponse(
        request,
        { error: 'Profile id in body must match URL' },
        { status: 400 },
      );
    }

    const summary = await saveProfile(profile, {
      ownerId: OFFICIAL_CATALOG_OWNER,
    });
    return jsonResponse(request, { summary, profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        request,
        { error: 'Invalid profile JSON', details: error.flatten() },
        { status: 400 },
      );
    }
    console.error('[PUT /api/dashboard/profiles/:id]', error);
    return jsonResponse(
      request,
      { error: error instanceof Error ? error.message : 'Failed to save profile' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!verifyDashboardRequest(request)) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteProfile(id);
    if (!deleted) {
      return jsonResponse(request, { error: 'Profile not found' }, { status: 404 });
    }
    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error('[DELETE /api/dashboard/profiles/:id]', error);
    return jsonResponse(
      request,
      { error: error instanceof Error ? error.message : 'Failed to delete profile' },
      { status: 500 },
    );
  }
}
