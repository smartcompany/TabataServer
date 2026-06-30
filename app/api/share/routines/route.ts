import { NextRequest } from 'next/server';
import { z } from 'zod';

import { jsonResponse, optionsResponse } from '@/lib/http';
import { parseRoutineProfile } from '@/lib/profile-schema';
import { createSharedRoutine } from '@/lib/shared-routine-store';
import { buildSharePageUrl } from '@/lib/share-url';

const bodySchema = z.object({
  routine: z.unknown(),
});

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        request,
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 },
      );
    }
    return jsonResponse(request, { error: 'Invalid request body' }, { status: 400 });
  }

  let routine;
  try {
    routine = parseRoutineProfile(body.routine);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        request,
        { error: 'Invalid routine', details: error.flatten() },
        { status: 400 },
      );
    }
    return jsonResponse(request, { error: 'Invalid routine' }, { status: 400 });
  }

  try {
    const row = await createSharedRoutine(routine);
    if (!row) {
      return jsonResponse(
        request,
        { error: 'Share storage is not configured' },
        { status: 503 },
      );
    }

    return jsonResponse(request, {
      shareId: row.id,
      shareUrl: buildSharePageUrl(row.id),
    });
  } catch (error) {
    console.error('[POST /api/share/routines] failed', error);
    return jsonResponse(request, { error: 'Failed to create share link' }, { status: 500 });
  }
}
