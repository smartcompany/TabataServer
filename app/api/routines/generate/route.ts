import { NextRequest } from 'next/server';
import { z } from 'zod';

import { generateRoutineFromPrompt } from '@/lib/ai-routine-generator';
import { jsonResponse, optionsResponse } from '@/lib/http';

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  contentLanguage: z.enum(['en', 'ko', 'zh', 'ja']).optional(),
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
      console.warn('[POST /api/routines/generate] invalid request body', {
        issues: error.issues,
      });
      return jsonResponse(
        request,
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 },
      );
    }
    console.error('[POST /api/routines/generate] failed to read body', error);
    return jsonResponse(request, { error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const profile = await generateRoutineFromPrompt(body);
    return jsonResponse(request, { profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[POST /api/routines/generate] invalid model output', {
        issues: error.issues,
      });
      return jsonResponse(
        request,
        {
          error: 'Generated routine failed validation',
          details: error.flatten(),
        },
        { status: 502 },
      );
    }

    const message =
      error instanceof Error ? error.message : 'Failed to generate routine';
    console.error('[POST /api/routines/generate]', error);
    return jsonResponse(request, { error: message }, { status: 500 });
  }
}
