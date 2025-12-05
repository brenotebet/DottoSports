import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth/react-native';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey:
    Constants.expoConfig?.extra?.firebase?.apiKey ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain:
    Constants.expoConfig?.extra?.firebase?.authDomain ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId:
    Constants.expoConfig?.extra?.firebase?.projectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket:
    Constants.expoConfig?.extra?.firebase?.storageBucket ??
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    '',
  messagingSenderId:
    Constants.expoConfig?.extra?.firebase?.messagingSenderId ??
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    '',
  appId:
    Constants.expoConfig?.extra?.firebase?.appId ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId:
    Constants.expoConfig?.extra?.firebase?.measurementId ??
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn(
    'Firebase config is missing. Set EXPO_PUBLIC_FIREBASE_* env vars or expoConfig.extra.firebase values.',
  );
}

const hasApp = getApps().length > 0;
const app = hasApp ? getApp() : initializeApp(firebaseConfig);

const auth = hasApp
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

const db = getFirestore(app);

export { app, auth, db };
