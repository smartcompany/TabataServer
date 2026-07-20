import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  grantEntitlement,
  hasEntitlementGrant,
  ONBOARDING_AI_AD_WAIVER,
} from '@/lib/entitlement-store';
import { verifyToken } from '@/lib/middleware/auth';
import { jsonResponse, optionsResponse } from '@/lib/http';

const installIdSchema = z.string().uuid();

function parseInstallId(request: NextRequest): string | null {
  const fromQuery = request.nextUrl.searchParams.get('installId');
  if (fromQuery) {
    const parsed = installIdSchema.safeParse(fromQuery);
    return parsed.success ? parsed.data : null;
  }
  return null;
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function GET(request: NextRequest) {
  const installId = parseInstallId(request);
  if (!installId) {
    return jsonResponse(
      request,
      { error: 'installId query parameter is required' },
      { status: 400 },
    );
  }

  try {
    const authUser = await verifyToken(request);
    const used = await hasEntitlementGrant(
      ONBOARDING_AI_AD_WAIVER,
      installId,
      authUser?.userId ?? null,
    );
    return jsonResponse(request, { eligible: !used, used });
  } catch (error) {
    console.error('[GET /api/entitlements/onboarding-ai-ad-waiver]', error);
    return jsonResponse(
      request,
      { error: 'Failed to check onboarding ad waiver' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = z
      .object({
        installId: installIdSchema,
      })
      .parse(await request.json());
    const authUser = await verifyToken(request);
    await grantEntitlement(
      ONBOARDING_AI_AD_WAIVER,
      body.installId,
      authUser?.userId ?? null,
    );
    return jsonResponse(request, { granted: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        request,
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 },
      );
    }
    console.error('[POST /api/entitlements/onboarding-ai-ad-waiver]', error);
    return jsonResponse(
      request,
      { error: 'Failed to record onboarding ad waiver' },
      { status: 500 },
    );
  }
}
