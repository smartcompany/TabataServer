import { NextRequest } from 'next/server';

import { getAiUsageDashboardData } from '@/lib/ai-usage-store';
import { verifyDashboardRequest } from '@/lib/dashboard-auth';
import { jsonResponse, optionsResponse } from '@/lib/http';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  if (!verifyDashboardRequest(request)) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usage = await getAiUsageDashboardData();
    return jsonResponse(request, usage);
  } catch (error) {
    console.error('[GET /api/dashboard/ai-usage]', error);
    return jsonResponse(
      request,
      { error: 'Failed to load AI usage' },
      { status: 500 },
    );
  }
}
