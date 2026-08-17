export type GeminiTokenUsage = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  totalTokenCount: number;
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
