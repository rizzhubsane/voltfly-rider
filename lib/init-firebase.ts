import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: "AIzaSyByBQBIKJdBNn-xUTDWaHHWhWHlU-pY3Uw",
  authDomain: "voltflyev.firebaseapp.com",
  projectId: "voltflyev",
  storageBucket: "voltflyev.firebasestorage.app",
  appId: "1:175288794190:android:bf96db924fd3f0ac38171f",
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
