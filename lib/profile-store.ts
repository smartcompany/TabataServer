import { list, put, del, head } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

import {
  parseRoutineProfile,
  type ProfileSummary,
  type RoutineProfile,
  toSummary,
} from './profile-schema';

const BLOB_PREFIX = 'profiles/';
const DATA_DIR = path.join(process.cwd(), 'data', 'profiles');

function blobPath(id: string) {
  return `${BLOB_PREFIX}${id}.json`;
}

function useBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBundledProfile(id: string): Promise<RoutineProfile | null> {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return parseRoutineProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function listBundledIds(): Promise<string[]> {
  try {
    const files = await fs.readdir(DATA_DIR);
    return files
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

async function readBlobProfile(id: string): Promise<{
  profile: RoutineProfile;
  updatedAt: string;
} | null> {
  if (!useBlobStorage()) return null;

  try {
    const meta = await head(blobPath(id));
    const response = await fetch(meta.url, { cache: 'no-store' });
    if (!response.ok) return null;
    const profile = parseRoutineProfile(await response.json());
    return {
      profile,
      updatedAt: meta.uploadedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

async function listBlobIds(): Promise<string[]> {
  if (!useBlobStorage()) return [];

  const result = await list({ prefix: BLOB_PREFIX });
  return result.blobs
    .map((blob) => blob.pathname.replace(BLOB_PREFIX, '').replace(/\.json$/, ''))
    .filter(Boolean);
}

async function getProfileMeta(id: string): Promise<ProfileSummary | null> {
  const blobbed = await readBlobProfile(id);
  if (blobbed) {
    return toSummary(blobbed.profile, blobbed.updatedAt);
  }

  const bundled = await readBundledProfile(id);
  if (!bundled) return null;

  const filePath = path.join(DATA_DIR, `${id}.json`);
  let updatedAt = new Date(0).toISOString();
  try {
    const stat = await fs.stat(filePath);
    updatedAt = stat.mtime.toISOString();
  } catch {
    // keep default
  }

  return toSummary(bundled, updatedAt);
}

export async function listProfileSummaries(): Promise<ProfileSummary[]> {
  const ids = new Set<string>([
    ...(await listBundledIds()),
    ...(await listBlobIds()),
  ]);

  const summaries = await Promise.all(
    Array.from(ids).map((id) => getProfileMeta(id)),
  );

  return summaries
    .filter((item): item is ProfileSummary => item !== null)
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

export async function getProfile(id: string): Promise<RoutineProfile | null> {
  const blobbed = await readBlobProfile(id);
  if (blobbed) return blobbed.profile;
  return readBundledProfile(id);
}

export async function saveProfile(profile: RoutineProfile): Promise<ProfileSummary> {
  const parsed = parseRoutineProfile(profile);
  const body = JSON.stringify(parsed, null, 2);
  const now = new Date().toISOString();

  if (useBlobStorage()) {
    await put(blobPath(parsed.id), body, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
    return toSummary(parsed, now);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Profile writes require BLOB_READ_WRITE_TOKEN on Vercel production',
    );
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, `${parsed.id}.json`), body, 'utf8');
  return toSummary(parsed, now);
}

export async function deleteProfile(id: string): Promise<boolean> {
  if (useBlobStorage()) {
    try {
      await del(blobPath(id));
      return true;
    } catch {
      return false;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Profile deletes require BLOB_READ_WRITE_TOKEN on Vercel production',
    );
  }

  const filePath = path.join(DATA_DIR, `${id}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
