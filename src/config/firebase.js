// Firebase configuration for RideOut
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDDSHimICCT0hI3eZVthIO9gygVqs-3HCM",
  authDomain: "rideout-c136a.firebaseapp.com",
  projectId: "rideout-c136a",
  storageBucket: "rideout-c136a.firebasestorage.app",
  messagingSenderId: "460917288536",
  appId: "1:460917288536:web:c0020005f18bf2a766242d",
  measurementId: "G-VXKPB48EM4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
