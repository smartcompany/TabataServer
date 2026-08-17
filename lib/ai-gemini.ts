import { geminiAi } from '@/lib/ai-client';
import type { GeminiTokenUsage } from '@/lib/gemini-usage';

/** Gemini chat preset — model and pricing are resolved by the Gemini client. */
export const GEMINI_ROUTINE_PRESET = 'long_output_lite' as const;

export function estimateRoutineCostUsd(usage: GeminiTokenUsage) {
  return geminiAi.estimateChatCostUsd(GEMINI_ROUTINE_PRESET, {
    inputTokens: usage.promptTokenCount,
    outputTokens: usage.candidatesTokenCount + usage.thoughtsTokenCount,
  });
}
