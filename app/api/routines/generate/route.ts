import { NextRequest } from 'next/server';
import { isGeminiApiError } from 'nextjs-share-lib/ai';
import { z } from 'zod';

import { generateRoutineFromPrompt } from '@/lib/ai-routine-generator';
import { jsonResponse, optionsResponse } from '@/lib/http';

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  contentLanguage: z.enum(['en', 'ko', 'zh', 'ja']).optional(),
});

/** Same string the app shows in the SnackBar (`body['error']`). */
function clientErrorMessage(error: unknown): string {
  if (isGeminiApiError(error)) {
    if (error.kind === 'high_demand') {
      return 'AI is busy right now. Please try again in a moment.';
    }
    if (error.isQuotaOrRateLimit) {
      return 'AI rate limit reached. Please try again later.';
    }
    return error.message;
  }
  if (error instanceof z.ZodError) {
    return 'Generated routine failed validation';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Failed to generate routine';
}

function responseStatus(error: unknown): number {
  if (isGeminiApiError(error)) {
    if (error.kind === 'high_demand' || error.isQuotaOrRateLimit) {
      return 429;
    }
    return 502;
  }
  if (error instanceof z.ZodError) {
    return 502;
  }
  return 500;
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = 'Invalid request';
      console.error('[POST /api/routines/generate] client error:', message);
      return jsonResponse(
        request,
        { error: message, details: error.flatten() },
        { status: 400 },
      );
    }
    const message = 'Invalid request body';
    console.error('[POST /api/routines/generate] client error:', message);
    return jsonResponse(request, { error: message }, { status: 400 });
  }

  try {
    const profile = await generateRoutineFromPrompt(body);
    return jsonResponse(request, { profile });
  } catch (error) {
    const message = clientErrorMessage(error);
    console.error('[POST /api/routines/generate] client error:', message);
    return jsonResponse(
      request,
      {
        error: message,
        ...(error instanceof z.ZodError
          ? { details: error.flatten() }
          : {}),
      },
      { status: responseStatus(error) },
    );
  }
}
