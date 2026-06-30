const DEFAULT_ORIGIN = 'https://tabata-server.vercel.app';

export function getPublicOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!fromEnv) return DEFAULT_ORIGIN;
  if (fromEnv.startsWith('http://') || fromEnv.startsWith('https://')) {
    return fromEnv.replace(/\/$/, '');
  }
  return `https://${fromEnv.replace(/\/$/, '')}`;
}

export function buildSharePageUrl(shareId: string): string {
  return `${getPublicOrigin()}/share/${encodeURIComponent(shareId)}`;
}

export function buildApplinkUrl(): string {
  return `${getPublicOrigin()}/applink`;
}

export function buildApplinkSocialUrl(): string {
  return `${getPublicOrigin()}/applink/social`;
}
