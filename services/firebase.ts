import { firebaseConfig } from '@/constants/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig); 

const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage), }); 

const db = getFirestore(app);