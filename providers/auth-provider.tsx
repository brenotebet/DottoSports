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

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido. Verifique o formato e tente novamente.',
  'auth/user-not-found': 'Nenhuma conta foi encontrada com este e-mail.',
  'auth/wrong-password': 'Senha incorreta. Confira e tente novamente.',
  'auth/weak-password': 'A senha não atende aos requisitos mínimos.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/missing-password': 'Informe sua senha para continuar.',
  'auth/network-request-failed': 'Não foi possível conectar. Verifique sua internet e tente novamente.',
};
const userDocRef = (uid: string) => doc(db, 'users', uid);
const VERIFICATION_THROTTLE_MS = 5 * 60 * 1000;

const resolveFriendlyAuthMessage = (error: unknown, fallback: string) => {
  const maybeCode = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  const normalizedCode = maybeCode.toLowerCase();
  if (normalizedCode.includes('too-many-requests')) {
    return 'Detectamos muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  }

  if (AUTH_ERROR_MESSAGES[normalizedCode]) {
    return AUTH_ERROR_MESSAGES[normalizedCode];
  }

  if (error instanceof Error) {
    return AUTH_ERROR_MESSAGES[normalizedCode] ?? error.message;
  }

  return fallback;
};

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
  const [lastVerificationRequest, setLastVerificationRequest] = useState<number | null>(null);

  const maybeSendVerification = async (firebaseUser: User, { force = false }: { force?: boolean } = {}) => {
    const now = Date.now();
    const withinThrottle = lastVerificationRequest && now - lastVerificationRequest < VERIFICATION_THROTTLE_MS;
    if (withinThrottle && !force) {
      return { sent: false, reason: 'recent' } as const;
    }

    try {
      await sendEmailVerification(firebaseUser);
      setLastVerificationRequest(now);
      return { sent: true } as const;
    } catch (error) {
      const friendly = resolveFriendlyAuthMessage(
        error,
        'Não foi possível enviar o e-mail de verificação agora.',
      );
      throw new Error(friendly);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = credential.user;

      if (!firebaseUser.emailVerified) {
        await maybeSendVerification(firebaseUser);
        throw new Error(
          'Confirme seu e-mail antes de continuar. Reenviamos (ou usamos o último link gerado) para verificar sua conta.',
        );
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
    } catch (error) {
      const friendly = resolveFriendlyAuthMessage(error, 'Não foi possível entrar agora.');
      throw new Error(friendly);
    }
  };

  const signup = async ({ email, password, ...profile }: SignupPayload) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = credential.user;

      const displayName = `${profile.firstName} ${profile.lastName}`.trim();

      if (displayName) {
        await updateProfile(firebaseUser, { displayName });
      }

      await maybeSendVerification(firebaseUser, { force: true });
      await upsertUserDocument(firebaseUser, 'STUDENT', displayName);

      // TODO: Persist profile data (profile) to your user collection once a backend is available
      void profile;
    } catch (error) {
      const friendly = resolveFriendlyAuthMessage(error, 'Não foi possível criar sua conta.');
      throw new Error(friendly);
    }
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
        try {
          await maybeSendVerification(firebaseUser);
        } catch (error) {
          console.warn('Verification e-mail skipped during auth restoration', error);
        }
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
