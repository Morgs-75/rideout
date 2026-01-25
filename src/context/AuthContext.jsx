import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// DEMO MODE - set to false for production with Firebase
const DEMO_MODE = false;

const DEMO_USER = {
  uid: 'demo-user-123',
  email: 'demo@rideout.app'
};

const DEMO_PROFILE = {
  id: 'demo-user-123',
  streetName: 'VoltRider',
  streetNameLower: 'voltrider',
  email: 'demo@rideout.app',
  avatar: '',
  bio: 'Electric dreams, zero emissions',
  bike: 'Sur-Ron X 2024',
  followers: 42,
  following: 18
};

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEMO_MODE ? DEMO_USER : null);
  const [userProfile, setUserProfile] = useState(DEMO_MODE ? DEMO_PROFILE : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserProfile({ id: userDoc.id, ...userDoc.data() });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const signUp = async (email, password, streetName, avatar = '', bio = '', bike = '', referredByCode = '') => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      setUserProfile({ ...DEMO_PROFILE, streetName, bio, bike });
      return DEMO_USER;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;

    const userProfileData = {
      streetName,
      streetNameLower: streetName.toLowerCase(),
      email,
      avatar,
      bio,
      bike,
      followers: 0,
      following: 0,
      referralCode: generateReferralCode(),
      referredBy: referredByCode || null,
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', newUser.uid), userProfileData);
    setUserProfile({ id: newUser.uid, ...userProfileData });

    return newUser;
  };

  const signIn = async (email, password) => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      setUserProfile(DEMO_PROFILE);
      return DEMO_USER;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const signOut = async () => {
    if (DEMO_MODE) {
      // In demo mode, just redirect to login visually
      return;
    }

    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (updates) => {
    if (DEMO_MODE) {
      setUserProfile(prev => ({ ...prev, ...updates }));
      return;
    }

    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isDemo: DEMO_MODE
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
