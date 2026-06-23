import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const SALT_BYTES = 16;

/** `saltHex.digestHex` — $ 없이 .env / Vercel에 안전 */
export function createDashboardPasswordHash(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const digest = createHash('sha256')
    .update(`${salt}:${password}`, 'utf8')
    .digest('hex');
  return `${salt}.${digest}`;
}

export function verifyDashboardPassword(
  password: string,
  stored: string,
): boolean {
  const trimmed = stored.trim();
  const dot = trimmed.indexOf('.');
  if (dot <= 0) return false;

  const salt = trimmed.slice(0, dot);
  const expectedDigest = trimmed.slice(dot + 1);
  if (!/^[a-f0-9]+$/i.test(salt + expectedDigest)) return false;

  const digest = createHash('sha256')
    .update(`${salt}:${password}`, 'utf8')
    .digest('hex');

  const a = Buffer.from(digest, 'hex');
  const b = Buffer.from(expectedDigest, 'hex');
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
