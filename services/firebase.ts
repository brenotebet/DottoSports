import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig } from '@/constants/firebase';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth = (() => {
  try {
    return getAuth(app);
  } catch {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
})();

const db = getFirestore(app);

console.log('[FIREBASE] app name=', app.name);
console.log('[FIREBASE] projectId=', (db as any)._databaseId?.projectId);
console.log('[FIREBASE] auth app name=', auth.app.name);
console.log('[FIREBASE] db app name=', (db as any)._app?.name);

export { app, auth, db };

