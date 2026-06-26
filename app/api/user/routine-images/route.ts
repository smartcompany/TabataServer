import { NextRequest } from 'next/server';

import { jsonResponse, optionsResponse } from '@/lib/http';
import { verifyToken } from '@/lib/middleware/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function resolveImageContentType(file: File): string | null {
  const declared = file.type?.toLowerCase() ?? '';
  if (ALLOWED_TYPES.has(declared)) {
    return declared;
  }

  const ext = file.name?.split('.').pop()?.toLowerCase() ?? '';
  const fromExt = EXTENSION_CONTENT_TYPES[ext];
  if (fromExt) {
    return fromExt;
  }

  if (!declared || declared === 'application/octet-stream') {
    return 'image/jpeg';
  }

  return null;
}

export async function OPTIONS(request: NextRequest) {
  return optionsResponse(request);
}

export async function POST(request: NextRequest) {
  const authUser = await verifyToken(request);
  if (!authUser) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse(
      request,
      { error: 'Storage not configured' },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return jsonResponse(request, { error: 'File is required' }, { status: 400 });
    }

    const fileObj = file as File;
    if (fileObj.size > MAX_BYTES) {
      return jsonResponse(
        request,
        { error: 'Image must be 8MB or smaller' },
        { status: 400 },
      );
    }

    const contentType = resolveImageContentType(fileObj);
    if (!contentType) {
      return jsonResponse(
        request,
        { error: 'Unsupported image type' },
        { status: 400 },
      );
    }

    const bucket = process.env.STORAGE_BUCKET?.trim() || 'tabata-server';
    const ext =
      fileObj.name?.split('.').pop()?.toLowerCase() ||
      contentType.split('/')[1] ||
      'jpg';
    const routineIdRaw = formData.get('routineId');
    const routineId =
      typeof routineIdRaw === 'string'
        ? routineIdRaw.trim().replace(/[^a-zA-Z0-9_-]/g, '')
        : '';
    const filePath = routineId
      ? `routine-images/${authUser.firebaseUid}/${routineId}/${crypto.randomUUID()}.${ext}`
      : `routine-images/${authUser.firebaseUid}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(filePath, fileObj, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.error('[POST /api/user/routine-images]', error);
      return jsonResponse(
        request,
        { error: 'Failed to upload image' },
        { status: 500 },
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return jsonResponse(request, { url: data.publicUrl }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/user/routine-images]', error);
    return jsonResponse(
      request,
      { error: 'Failed to upload image' },
      { status: 500 },
    );
  }
}
