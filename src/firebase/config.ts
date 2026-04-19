import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// ── Firebase project config ───────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyDVSOCME3VirH7aPGsoyXH4icBw3xYTKP4',
  authDomain:        'healthai-f8749.firebaseapp.com',
  databaseURL:       'https://healthai-f8749-default-rtdb.firebaseio.com',
  projectId:         'healthai-f8749',
  storageBucket:     'healthai-f8749.firebasestorage.app',
  messagingSenderId: '846344289593',
  appId:             '1:846344289593:web:7dd2d5781ba5fc0bae3ce8',
};

// ── Initialize ────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

export const auth          = getAuth(app);
export const db            = getDatabase(app);          // Realtime Database
export const googleProvider = new GoogleAuthProvider();

// ── Auth helpers (re-exported for convenience) ────────────
export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type FirebaseUser,
};
