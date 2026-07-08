/** Gemini 2.5 Flash-Lite paid standard tier (USD per 1M tokens). */
export const GEMINI_25_FLASH_LITE_INPUT_USD_PER_M = 0.1;
export const GEMINI_25_FLASH_LITE_OUTPUT_USD_PER_M = 0.4;

export type GeminiTokenUsage = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  totalTokenCount: number;
};

export type GeminiCostEstimateUsd = {
  inputUsd: number;
  outputUsd: number;
  totalUsd: number;
  pricingModel: 'gemini-2.5-flash-lite';
  pricingTier: 'paid-standard';
  note: string;
};

function toUsageInt(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed);
}

export function parseGeminiTokenUsage(
  usage: Record<string, unknown> | undefined,
): GeminiTokenUsage | undefined {
  if (!usage) {
    return undefined;
  }

  const promptTokenCount = toUsageInt(usage.promptTokenCount);
  const candidatesTokenCount = toUsageInt(usage.candidatesTokenCount);
  const thoughtsTokenCount = toUsageInt(usage.thoughtsTokenCount);
  const totalTokenCount =
    toUsageInt(usage.totalTokenCount) ||
    promptTokenCount + candidatesTokenCount + thoughtsTokenCount;

  if (totalTokenCount <= 0) {
    return undefined;
  }

  return {
    promptTokenCount,
    candidatesTokenCount,
    thoughtsTokenCount,
    totalTokenCount,
  };
}

export function estimateGeminiFlashCostUsd(
  usage: GeminiTokenUsage,
): GeminiCostEstimateUsd {
  const outputTokenCount =
    usage.candidatesTokenCount + usage.thoughtsTokenCount;
  const inputUsd =
    (usage.promptTokenCount / 1_000_000) *
    GEMINI_25_FLASH_LITE_INPUT_USD_PER_M;
  const outputUsd =
    (outputTokenCount / 1_000_000) *
    GEMINI_25_FLASH_LITE_OUTPUT_USD_PER_M;

  return {
    inputUsd,
    outputUsd,
    totalUsd: inputUsd + outputUsd,
    pricingModel: 'gemini-2.5-flash-lite',
    pricingTier: 'paid-standard',
    note:
      'Free tier is $0. Estimate uses Gemini 2.5 Flash-Lite paid standard pricing.',
  };
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function formatUsd(value: number): string {
  if (value === 0) {
    return '$0.00';
  }
  if (value < 0.01) {
    return `<$0.01`;
  }
  return `$${value.toFixed(2)}`;
}
