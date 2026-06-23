import { NextRequest } from 'next/server';

import { verifyDashboardRequest } from '@/lib/dashboard-auth';
import { jsonResponse, optionsResponse } from '@/lib/http';
import { getProfile, listProfileSummaries } from '@/lib/profile-store';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  if (!verifyDashboardRequest(request)) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summaries = await listProfileSummaries();
    const profiles = await Promise.all(
      summaries.map(async (summary) => {
        const profile = await getProfile(summary.id);
        return { summary, profile };
      }),
    );
    return jsonResponse(request, {
      profiles: profiles.filter((item) => item.profile !== null),
    });
  } catch (error) {
    console.error('[GET /api/dashboard/profiles]', error);
    return jsonResponse(
      request,
      { error: 'Failed to list profiles' },
      { status: 500 },
    );
  }
}
