import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 },
      );
    }

    const kakaoResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!kakaoResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid Kakao access token' },
        { status: 401 },
      );
    }

    const kakaoUser = await kakaoResponse.json();
    const kakaoId = kakaoUser.id.toString();
    const uid = `kakao:${kakaoId}`;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const { auth } = getFirebaseAdmin();
    const customToken = await auth.createCustomToken(uid, {
      provider: 'kakao',
      kakaoId,
    });

    return NextResponse.json({
      uid,
      kakao_id: kakaoId,
      custom_token: customToken,
    });
  } catch (error) {
    console.error('Kakao Firebase login error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (
      message.includes('FIREBASE_SERVICE_ACCOUNT_KEY') ||
      message.includes('credential')
    ) {
      return NextResponse.json(
        { error: 'Firebase configuration error' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: `Failed to login with Kakao: ${message}` },
      { status: 500 },
    );
  }
}
