import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/middleware/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { deleteUserAccount } from '@/lib/user-account';

function userResponse(data: Record<string, unknown>) {
  return NextResponse.json({
    id: data.user_id,
    user_id: data.user_id,
    full_name: data.full_name,
    created_at: data.created_at,
    updated_at: data.updated_at,
    is_active: data.is_active,
  });
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyToken(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const { data, error } = await supabase
      .from('tabata_users')
      .select('*')
      .eq('user_id', authUser.firebaseUid)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'User not found. Please complete profile setup.' },
        { status: 404 },
      );
    }

    return userResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('FIREBASE_SERVICE_ACCOUNT_KEY') ||
      message.includes('credential')
    ) {
      console.error('Firebase admin not configured:', error);
      return NextResponse.json(
        { error: 'Firebase admin not configured on server' },
        { status: 503 },
      );
    }
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    let uid: string;
    let kakaoId: string | undefined;

    if (body.kakao_id) {
      kakaoId = body.kakao_id as string;
      uid = `kakao:${kakaoId}`;
    } else {
      const authUser = await verifyToken(request);
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      uid = authUser.firebaseUid;
    }

    if (!body.full_name || body.full_name.trim().length < 2) {
      return NextResponse.json(
        { error: '이름은 2자 이상 입력해주세요.' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const { data: existingUser, error: findError } = await supabase
      .from('tabata_users')
      .select('*')
      .eq('user_id', uid)
      .single();

    let data;
    let isNewUser = false;

    if (findError || !existingUser) {
      isNewUser = true;
      const { data: newUser, error: createError } = await supabase
        .from('tabata_users')
        .insert({
          user_id: uid,
          full_name: body.full_name.trim(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Create user error:', createError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 },
        );
      }

      data = newUser;
    } else {
      const { data: updatedUser, error: updateError } = await supabase
        .from('tabata_users')
        .update({ full_name: body.full_name.trim() })
        .eq('user_id', uid)
        .select()
        .single();

      if (updateError) {
        console.error('Update user error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user profile' },
          { status: 500 },
        );
      }

      data = updatedUser;
    }

    if (kakaoId && isNewUser) {
      const { auth } = getFirebaseAdmin();
      const customToken = await auth.createCustomToken(uid, {
        provider: 'kakao',
        kakaoId,
      });

      return NextResponse.json({
        id: data.user_id,
        user_id: data.user_id,
        full_name: data.full_name,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_active: data.is_active,
        custom_token: customToken,
      });
    }

    return userResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('FIREBASE_SERVICE_ACCOUNT_KEY') ||
      message.includes('credential')
    ) {
      console.error('Firebase admin not configured:', error);
      return NextResponse.json(
        { error: 'Firebase admin not configured on server' },
        { status: 503 },
      );
    }
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await verifyToken(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const result = await deleteUserAccount(authUser.firebaseUid);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('FIREBASE_SERVICE_ACCOUNT_KEY') ||
      message.includes('credential')
    ) {
      console.error('Firebase admin not configured:', error);
      return NextResponse.json(
        { error: 'Firebase admin not configured on server' },
        { status: 503 },
      );
    }
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: message || 'Failed to delete account' },
      { status: 500 },
    );
  }
}
