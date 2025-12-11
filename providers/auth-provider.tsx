import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as FileSystem from 'expo-file-system';

import { getAccountInfo, sendEmailVerification, signInWithEmail, signUpWithEmail } from '@/services/firebase-auth';
import { resolveSeedDisplayName, resolveSeedRole } from '@/constants/seed-data';
import type { UserRole } from '@/constants/schema';

export type AuthenticatedUser = {
  email: string;
  idToken: string;
  refreshToken: string;
  uid: string;
   role: UserRole;
   displayName: string;
};

type AuthContextValue = {
  user: AuthenticatedUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (allowed: UserRole | UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const authStateFile = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ''}auth-user.json`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const buildAuthenticatedUser = (credentials: Omit<AuthenticatedUser, 'role' | 'displayName'>) => {
    const resolvedRole = resolveSeedRole(credentials.email) ?? 'STUDENT';

    return {
      ...credentials,
      role: resolvedRole,
      displayName: resolveSeedDisplayName(credentials.email) ?? credentials.email,
    } satisfies AuthenticatedUser;
  };

  const persistUser = async (nextUser: AuthenticatedUser | null) => {
    if (!authStateFile) return;

    try {
      if (nextUser) {
        await FileSystem.writeAsStringAsync(authStateFile, JSON.stringify(nextUser));
      } else {
        const fileInfo = await FileSystem.getInfoAsync(authStateFile);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(authStateFile, { idempotent: true });
        }
      }
    } catch (error) {
      console.warn('Não foi possível atualizar o cache de autenticação', error);
    }
  };

  const login = async (email: string, password: string) => {
    const credentials = await signInWithEmail(email.trim(), password);
    const accountInfo = await getAccountInfo(credentials.idToken);

    if (!accountInfo.emailVerified) {
      await sendEmailVerification(credentials.idToken);
      throw new Error('Confirme seu e-mail antes de continuar. Enviamos um novo link de verificação.');
    }

    const authenticated = buildAuthenticatedUser(credentials);
    setUser(authenticated);
    await persistUser(authenticated);
  };

  const signup = async (email: string, password: string) => {
    const credentials = await signUpWithEmail(email.trim(), password);
    await sendEmailVerification(credentials.idToken);
  };

  const logout = () => {
    setUser(null);
    void persistUser(null);
  };

  useEffect(() => {
    let isMounted = true;

    const restoreUser = async () => {
      if (!authStateFile) {
        setInitializing(false);
        return;
      }

      try {
        const fileInfo = await FileSystem.getInfoAsync(authStateFile);
        if (!fileInfo.exists) {
          setInitializing(false);
          return;
        }

        const content = await FileSystem.readAsStringAsync(authStateFile);
        const storedUser = JSON.parse(content) as AuthenticatedUser;

        if (storedUser && isMounted) {
          setUser(storedUser);
        }
      } catch (error) {
        console.warn('Não foi possível restaurar a sessão anterior', error);
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    void restoreUser();

    return () => {
      isMounted = false;
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
