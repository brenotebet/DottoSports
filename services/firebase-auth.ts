import { firebaseConfig } from '@/constants/firebase';

const buildFirebaseUrl = (path: string) => {
  if (!firebaseConfig.apiKey) {
    throw new Error('Missing Firebase API key. Set EXPO_PUBLIC_FIREBASE_API_KEY in your environment.');
  }

  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${firebaseConfig.apiKey}`;
};

const handleRequest = async <T>(path: string, body: Record<string, string | boolean>): Promise<T> => {
  const response = await fetch(buildFirebaseUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message ?? 'Unable to complete authentication request.';
    throw new Error(message);
  }

  return data as T;
};

type FirebaseAuthResponse = {
  email: string;
  idToken: string;
  refreshToken: string;
  localId: string;
};

type AccountInfoResponse = {
  users?: {
    email: string;
    emailVerified: boolean;
  }[];
};

export const signInWithEmail = async (email: string, password: string) => {
  const response = await handleRequest<FirebaseAuthResponse>('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });

  return {
    email: response.email,
    idToken: response.idToken,
    refreshToken: response.refreshToken,
    uid: response.localId,
  };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const response = await handleRequest<FirebaseAuthResponse>('accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  });

  return {
    email: response.email,
    idToken: response.idToken,
    refreshToken: response.refreshToken,
    uid: response.localId,
  };
};

export const getAccountInfo = async (idToken: string) => {
  const response = await handleRequest<AccountInfoResponse>('accounts:lookup', {
    idToken,
  });

  const user = response.users?.[0];

  return {
    emailVerified: user?.emailVerified ?? false,
    email: user?.email ?? '',
  };
};

export const sendEmailVerification = async (idToken: string) => {
  await handleRequest('accounts:sendOobCode', {
    requestType: 'VERIFY_EMAIL',
    idToken,
  });
};
