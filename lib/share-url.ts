const DEFAULT_ORIGIN = 'https://tabata-server.vercel.app';

export function buildSharePageUrl(shareId: string): string {
  return `${DEFAULT_ORIGIN}/share/${encodeURIComponent(shareId)}`;
}

export function buildApplinkUrl(): string {
  return `${DEFAULT_ORIGIN}/applink`;
}

export function buildApplinkSocialUrl(): string {
  return `${DEFAULT_ORIGIN}/applink/social`;
}
