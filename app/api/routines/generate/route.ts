import { NextRequest } from 'next/server';
import { z } from 'zod';

import { generateRoutineFromPrompt } from '@/lib/ai-routine-generator';
import { jsonResponse, optionsResponse } from '@/lib/http';

const bodySchema = z.object({
  prompt: z.string().min(8).max(4000),
  contentLanguage: z.enum(['en', 'ko', 'zh', 'ja']).optional(),
});

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const profile = await generateRoutineFromPrompt(body);
    return jsonResponse(request, { profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        request,
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : 'Failed to generate routine';
    console.error('[POST /api/routines/generate]', error);
    return jsonResponse(request, { error: message }, { status: 500 });
  }
}
