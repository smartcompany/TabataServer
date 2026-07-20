import { NextRequest } from 'next/server';
import { z } from 'zod';

import { linkInstallGrantsToUser } from '@/lib/entitlement-store';
import { verifyToken } from '@/lib/middleware/auth';
import { jsonResponse, optionsResponse } from '@/lib/http';

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyToken(request);
    if (!authUser?.userId) {
      return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
    }

    const body = z
      .object({
        installId: z.string().uuid(),
      })
      .parse(await request.json());

    await linkInstallGrantsToUser(body.installId, authUser.userId);
    return jsonResponse(request, { linked: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        request,
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 },
      );
    }
    console.error('[POST /api/entitlements/link-install]', error);
    return jsonResponse(
      request,
      { error: 'Failed to link install entitlements' },
      { status: 500 },
    );
  }
}
