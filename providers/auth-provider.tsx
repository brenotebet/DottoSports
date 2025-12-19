import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import type { UserRole } from '@/constants/schema';
import { auth, db } from '@/services/firebase';

export type AuthenticatedUser = {
  email: string;
  idToken?: string;
  refreshToken?: string;
  uid: string;
  role: UserRole;
  displayName: string;
};

export type SignupPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  cpf: string;
};

type AuthContextValue = {
  user: AuthenticatedUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
  hasRole: (allowed: UserRole | UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const userDocRef = (uid: string) => doc(db, 'users', uid);

const upsertUserDocument = async (firebaseUser: User, roleHint?: UserRole, displayNameHint?: string) => {
  const ref = userDocRef(firebaseUser.uid);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();
  const email = firebaseUser.email ?? '';
  const resolvedRole = (existing.data()?.role as UserRole | undefined) ?? roleHint ?? 'STUDENT';
  const resolvedDisplayName = existing.data()?.displayName ?? displayNameHint ?? firebaseUser.displayName ?? email;

  await setDoc(
    ref,
    {
      id: firebaseUser.uid,
      email,
      role: resolvedRole,
      displayName: resolvedDisplayName,
      createdAt: existing.data()?.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true },
  );

  return { role: resolvedRole, displayName: resolvedDisplayName };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const firebaseUser = credential.user;

    if (!firebaseUser.emailVerified) {
      await sendEmailVerification(firebaseUser);
      throw new Error('Confirme seu e-mail antes de continuar. Enviamos um novo link de verificação.');
    }

    const { role, displayName } = await upsertUserDocument(firebaseUser);
    const idToken = await firebaseUser.getIdToken();
    const authenticated: AuthenticatedUser = {
      email: firebaseUser.email ?? email,
      uid: firebaseUser.uid,
      role,
      displayName,
      idToken,
      refreshToken: firebaseUser.refreshToken ?? undefined,
    };

    setUser(authenticated);
  };

  const signup = async ({ email, password, ...profile }: SignupPayload) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const firebaseUser = credential.user;

    const displayName = `${profile.firstName} ${profile.lastName}`.trim();

    if (displayName) {
      await updateProfile(firebaseUser, { displayName });
    }

    await sendEmailVerification(firebaseUser);
    await upsertUserDocument(firebaseUser, 'STUDENT', displayName);

    // TODO: Persist profile data (profile) to your user collection once a backend is available
    void profile;
  };

  const logout = () => {
    void signOut(auth);
    setUser(null);
  };

  useEffect(() => {
    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isActive) return;

      if (!firebaseUser) {
        setUser(null);
        setInitializing(false);
        return;
      }

      if (!firebaseUser.emailVerified) {
        await sendEmailVerification(firebaseUser);
        setUser(null);
        setInitializing(false);
        return;
      }

      const { role, displayName } = await upsertUserDocument(firebaseUser);
      const idToken = await firebaseUser.getIdToken();

      if (!isActive) return;

      setUser({
        email: firebaseUser.email ?? '',
        uid: firebaseUser.uid,
        role,
        displayName,
        idToken,
        refreshToken: firebaseUser.refreshToken ?? undefined,
      });
      setInitializing(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const hasRole = (allowed: UserRole | UserRole[]) => {
    const requiredRoles = Array.isArray(allowed) ? allowed : [allowed];
    return user ? requiredRoles.includes(user.role) : false;
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      signup,
      logout,
      hasRole,
    }),
    [user, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
