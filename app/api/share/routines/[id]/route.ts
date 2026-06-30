import { NextRequest } from 'next/server';

import { jsonResponse, optionsResponse } from '@/lib/http';
import { getSharedRoutine } from '@/lib/shared-routine-store';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const shareId = id.trim();
  if (!shareId) {
    return jsonResponse(request, { error: 'Missing share id' }, { status: 400 });
  }

  try {
    const row = await getSharedRoutine(shareId);
    if (!row) {
      return jsonResponse(request, { error: 'Share not found' }, { status: 404 });
    }

    return jsonResponse(request, {
      shareId: row.id,
      createdAt: row.created_at,
      routine: row.data,
    });
  } catch (error) {
    console.error('[GET /api/share/routines/:id] failed', error);
    return jsonResponse(request, { error: 'Failed to load share' }, { status: 500 });
  }
}
