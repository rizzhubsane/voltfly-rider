import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: "AIzaSyAc5XdhOB8cedZX-zsTTDC0KxfzNjCgILM",
  authDomain: "voltfly-prodrider.firebaseapp.com",
  projectId: "voltfly-prodrider",
  storageBucket: "voltfly-prodrider.firebasestorage.app",
  appId: "1:1066408236847:android:1a58e66d6af5e348c633da",
};

// Initialize Firebase App
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(firebaseApp);
} else {
  try {
    auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e: any) {
    // If already initialized (e.g. during fast refresh), get the existing instance
    if (e.code === 'auth/already-initialized') {
      auth = getAuth(firebaseApp);
    } else {
      throw e;
    }
  }
}

export { firebaseApp, auth };
