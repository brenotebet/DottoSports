import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { getAccountInfo, sendEmailVerification, signInWithEmail, signUpWithEmail } from '@/services/firebase-auth';

export type AuthenticatedUser = {
  email: string;
  idToken: string;
  refreshToken: string;
  uid: string;
};

type AuthContextValue = {
  user: AuthenticatedUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const initializing = false;

  const login = async (email: string, password: string) => {
    const credentials = await signInWithEmail(email.trim(), password);
    const accountInfo = await getAccountInfo(credentials.idToken);

    if (!accountInfo.emailVerified) {
      await sendEmailVerification(credentials.idToken);
      throw new Error('Confirme seu e-mail antes de continuar. Enviamos um novo link de verificação.');
    }

    setUser(credentials);
  };

  const signup = async (email: string, password: string) => {
    const credentials = await signUpWithEmail(email.trim(), password);
    await sendEmailVerification(credentials.idToken);
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      signup,
      logout,
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
