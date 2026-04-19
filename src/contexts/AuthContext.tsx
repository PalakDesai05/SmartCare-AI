import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type FirebaseUser,
} from '../firebase/config';
import { saveUserProfile, getUserProfile, saveDoctor, type DbUser } from '../firebase/firebaseDb';
import { api } from '../services/api';

export type Role = 'patient' | 'doctor' | 'admin' | 'pharmacy';

export interface AuthUser {
  id:          number;        // backend numeric id (0 if backend not available)
  firebaseUid: string;
  name:        string;
  email:       string;
  role:        Role;
  photoURL?:   string;
}

interface RegisterData {
  name:    string;
  email:   string;
  password: string;
  phone?:  string;
}

interface AuthContextType {
  user:                AuthUser | null;
  firebaseUser:        FirebaseUser | null;
  isAuthenticated:     boolean;
  isLoading:           boolean;
  error:               string | null;
  loginWithEmail:      (email: string, password: string) => Promise<void>;
  loginWithGoogle:     () => Promise<void>;
  loginOrCreateDemo:   (email: string, password: string, name: string, role: Role) => Promise<void>;
  register:            (data: RegisterData) => Promise<void>;
  logout:              () => Promise<void>;
  clearError:          () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Save / retrieve user profile via RTDB ────────────────
async function saveProfile(fbUser: FirebaseUser, role: Role, phone?: string): Promise<void> {
  const profile: DbUser = {
    uid:       fbUser.uid,
    name:      fbUser.displayName || fbUser.email!.split('@')[0],
    email:     fbUser.email!,
    role,
    phone,
    photoURL:  fbUser.photoURL || undefined,
    createdAt: Date.now(),
  };
  await saveUserProfile(profile).catch(() => {/* RTDB might be offline */});
}

/**
 * After Firebase auth, sync with FastAPI backend to get role & numeric id.
 * Falls back to Firebase RTDB profile, then localStorage, then defaults.
 */
async function syncWithBackend(
  fbUser: FirebaseUser,
  passwordHint?: string
): Promise<AuthUser> {
  const email = fbUser.email!;
  const name  = fbUser.displayName || email.split('@')[0];

  // 1. Try FastAPI backend (has role, numeric id)
  try {
    const pw   = passwordHint || fbUser.uid;
    const data = await api.login(email, pw);
    api.setToken(data.access_token);
    const u: AuthUser = {
      id:          data.user_id,
      firebaseUid: fbUser.uid,
      name:        data.name,
      email,
      role:        data.role as Role,
      photoURL:    fbUser.photoURL || undefined,
    };
    localStorage.setItem('healthai_user', JSON.stringify(u));
    // Persist to RTDB
    await saveProfile(fbUser, u.role);
    return u;
  } catch { /* backend unavailable */ }

  // 2. Try RTDB profile (has role saved from previous login)
  try {
    const rtdbProfile = await getUserProfile(fbUser.uid);
    if (rtdbProfile) {
      const u: AuthUser = {
        id:          0,
        firebaseUid: fbUser.uid,
        name:        rtdbProfile.name,
        email,
        role:        rtdbProfile.role,
        photoURL:    fbUser.photoURL || undefined,
      };
      localStorage.setItem('healthai_user', JSON.stringify(u));
      return u;
    }
  } catch { /* RTDB unavailable */ }

  // 3. Restore from localStorage
  const stored = localStorage.getItem('healthai_user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AuthUser;
      if (parsed.firebaseUid === fbUser.uid) return parsed;
    } catch { /* corrupt */ }
  }

  // 4. Final fallback — patient with Firebase identity
  const fallback: AuthUser = {
    id:          0,
    firebaseUid: fbUser.uid,
    name,
    email,
    role:        'patient',
    photoURL:    fbUser.photoURL || undefined,
  };
  localStorage.setItem('healthai_user', JSON.stringify(fallback));
  await saveProfile(fbUser, 'patient');
  return fallback;
}

// ── Provider ──────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user,         setUser]         = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem('healthai_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Restore API token on mount
  useEffect(() => {
    const token = localStorage.getItem('healthai_token');
    if (token) api.setToken(token);
  }, []);

  // ── Firebase auth-state listener (single source of truth) ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fbUser => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Use cached localStorage user immediately for instant UI
        const stored = localStorage.getItem('healthai_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as AuthUser;
            if (parsed.firebaseUid === fbUser.uid) {
              setUser(parsed);
              setIsLoading(false);
              return;
            }
          } catch { /* invalid */ }
        }
        try {
          const u = await syncWithBackend(fbUser);
          setUser(u);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem('healthai_user');
      }
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // ── Email / password login ────────────────────────────
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const cred    = await signInWithEmailAndPassword(auth, email, password);
      const appUser = await syncWithBackend(cred.user, password);
      setUser(appUser);
    } catch (err: any) {
      const msg = firebaseErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Demo login: sign-in, auto-create if not exists ────
  const loginOrCreateDemo = useCallback(async (
    email: string,
    password: string,
    name: string,
    role: Role,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        const c = signInErr.code as string;
        if (c === 'auth/user-not-found' || c === 'auth/invalid-credential' || c === 'auth/wrong-password') {
          cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: name });
          await saveProfile(cred.user, role);
          try { await api.register({ name, email, password, role } as any); } catch { /**/ }
        } else {
          throw signInErr;
        }
      }

      const appUser = await syncWithBackend(cred.user, password);
      const finalUser: AuthUser = { ...appUser, role };
      setUser(finalUser);
      localStorage.setItem('healthai_user', JSON.stringify(finalUser));

      // Seed /doctors/ profile for demo doctor so PatientQueue prescription upload works
      if (role === 'doctor') {
        const uid = cred.user.uid;
        const { getDoctorByUid } = await import('../firebase/firebaseDb');
        const existing = await getDoctorByUid(uid).catch(() => null);
        if (!existing) {
          await saveDoctor({
            uid,
            name,
            email,
            specialization:    'General Physician',
            experience:        '5+ years',
            location:          'Hospital Main Building',
            fee:               500,
            rating:            4.5,
            reviews:           0,
            available:         true,
            linkedPharmacyUid: '',
            createdAt:         Date.now(),
          });
        }
      }

      // Seed /users/ with role=pharmacy for demo pharmacy account
      if (role === 'pharmacy') {
        const uid = cred.user.uid;
        const existing = await getUserProfile(uid).catch(() => null);
        if (!existing || existing.role !== 'pharmacy') {
          await saveUserProfile({
            uid, name, email, role: 'pharmacy', createdAt: Date.now(),
          });
        }
      }

    } catch (err: any) {
      const msg = firebaseErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Google Sign-In ────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const cred    = await signInWithPopup(auth, googleProvider);
      const appUser = await syncWithBackend(cred.user);
      setUser(appUser);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setIsLoading(false);
        return;
      }
      const msg = firebaseErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Register (email/password, patient only) ───────────
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Create Firebase user
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(cred.user, { displayName: data.name });

      // 2. Save profile to RTDB immediately
      await saveProfile(cred.user, 'patient', data.phone);

      // 3. Register on FastAPI backend (best-effort)
      try {
        await api.register({
          name: data.name, email: data.email,
          password: data.password, phone: data.phone, role: 'patient',
        });
      } catch { /* backend not running */ }

      // 4. Sync and store
      const appUser = await syncWithBackend(cred.user, data.password);
      setUser(appUser);
    } catch (err: any) {
      const msg = firebaseErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────
  const logout = useCallback(async () => {
    await signOut(auth);
    api.clearToken();
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem('healthai_user');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{
      user, firebaseUser,
      isAuthenticated: !!user,
      isLoading, error,
      loginWithEmail, loginWithGoogle, loginOrCreateDemo,
      register, logout, clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// ── Human-readable Firebase error messages ────────────
function firebaseErrorMessage(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/email-already-in-use':   'An account with this email already exists.',
    'auth/weak-password':          'Password should be at least 6 characters.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/too-many-requests':      'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-blocked':          'Popup was blocked. Allow popups for this site.',
    'auth/invalid-credential':     'Invalid credentials. Check your email and password.',
  };
  return map[code] || 'Authentication failed. Please try again.';
}
