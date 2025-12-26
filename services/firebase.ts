import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

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
const functions = getFunctions(app);

if (__DEV__) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    console.log('[FIREBASE] connected to emulators');
  } catch (e) {
    console.log('[FIREBASE] emulators already connected');
  }
}

console.log('[FIREBASE] app name=', app.name);
console.log('[FIREBASE] projectId=', (db as any)._databaseId?.projectId);
console.log('[FIREBASE] auth app name=', auth.app.name);
console.log('[FIREBASE] db app name=', (db as any)._app?.name);

export { app, auth, db, functions };

