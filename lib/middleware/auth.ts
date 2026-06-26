import { NextRequest } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

export interface AuthUser {
  userId: string;
  firebaseUid: string;
  email?: string;
}

export async function verifyToken(
  request: NextRequest,
): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.substring(7);
    const { auth } = getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(idToken);

    return {
      userId: decodedToken.uid,
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
