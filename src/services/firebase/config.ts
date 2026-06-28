import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const required = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_DATABASE_URL',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key} — copy .env.example to .env and fill in values.`);
  }
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL!,
};

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApps()[0];

// initializeAuth throws on second call (HMR); fall back to getAuth
export const auth = isFirstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db = getDatabase(app, process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL!);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Emülatör bağlantıları — yalnız geliştirme modunda, sadece ilk init'te bağlan
if (__DEV__ && isFirstInit) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectDatabaseEmulator(db, 'localhost', 9000);
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
