import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Platform } from 'react-native';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

import { firebaseConfig } from '@/constants/firebase';

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Missing Firebase configuration. Set EXPO_PUBLIC_FIREBASE_API_KEY and EXPO_PUBLIC_FIREBASE_PROJECT_ID.');
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = (() => {
  if (Platform.OS !== 'web') {
    try {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (error) {
      return getAuth(app);
    }
  }

  return getAuth(app);
})();

const firestore = (() => {
  try {
    return getFirestore(app);
  } catch (error) {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  }
})();

export { app as firebaseApp, auth, firestore };
