import { NextRequest } from 'next/server';
import { z } from 'zod';

import { generateRoutineFromPrompt } from '@/lib/ai-routine-generator';
import { verifyDashboardRequest } from '@/lib/dashboard-auth';
import {
  clientMessageForGeminiError,
  httpStatusForGeminiError,
} from '@/lib/gemini-errors';
import { jsonResponse, optionsResponse } from '@/lib/http';

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  contentLanguage: z.enum(['en', 'ko', 'zh', 'ja']).optional(),
});

function clientErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Generated routine failed validation';
  }
  return clientMessageForGeminiError(error);
}

function responseStatus(error: unknown): number {
  if (error instanceof z.ZodError) {
    return 502;
  }
  return httpStatusForGeminiError(error);
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  if (!verifyDashboardRequest(request)) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

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

  try {
    const profile = await generateRoutineFromPrompt(body);
    return jsonResponse(request, { profile });
  } catch (error) {
    const message = clientErrorMessage(error);
    console.error('[POST /api/dashboard/routines/generate]', message);
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
