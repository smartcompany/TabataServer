import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let firebaseApp: App | null = null;
let auth: Auth | null = null;

export function getFirebaseAdmin(): { app: App; auth: Auth } {
  if (!firebaseApp || !auth) {
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
      auth = getAuth(firebaseApp);
    } else {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (!serviceAccount) {
        throw new Error(
          'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.',
        );
      }

      let serviceAccountJson: Record<string, unknown>;
      try {
        serviceAccountJson = JSON.parse(serviceAccount);
      } catch {
        try {
          serviceAccountJson = require(serviceAccount);
        } catch {
          throw new Error(
            'Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Must be JSON string or file path.',
          );
        }
      }

      firebaseApp = initializeApp({
        credential: cert(serviceAccountJson),
      });
      auth = getAuth(firebaseApp);
    }
  }

  return { app: firebaseApp, auth };
}
