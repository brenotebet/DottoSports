import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification as firebaseSendEmailVerification,
  signInWithEmailAndPassword,
  type User,
  signOut,
} from 'firebase/auth';

import { auth } from './firebase';

const translateFirebaseError = (code?: string) => {
  if (!code) return 'Não foi possível concluir a solicitação. Tente novamente.';

  const normalizedCode = code.toLowerCase();

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Entre ou escolha outro endereço.',
    'auth/invalid-email': 'Digite um e-mail válido para continuar.',
    'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
    'auth/invalid-credential': 'E-mail ou senha não conferem. Verifique e tente novamente.',
    'auth/invalid-password': 'E-mail ou senha não conferem. Verifique e tente novamente.',
    'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com o suporte.',
    'auth/too-many-requests': 'Detectamos muitas tentativas. Aguarde alguns instantes antes de tentar novamente.',
    'auth/weak-password': 'Sua senha precisa ter pelo menos 6 caracteres.',
  };

  return messages[normalizedCode] ?? 'Não foi possível concluir a solicitação. Tente novamente.';
};

const buildAuthenticatedResponse = async (user: User | null) => {
  const idToken = await user?.getIdToken(true);

  if (!user?.email || !idToken) {
    throw new Error('Não foi possível concluir a solicitação. Tente novamente.');
  }

  return {
    email: user.email,
    idToken,
    refreshToken: user.refreshToken,
    uid: user.uid,
  };
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    await reload(credentials.user);
    return buildAuthenticatedResponse(credentials.user);
  } catch (error: unknown) {
    const message = translateFirebaseError((error as { code?: string })?.code);
    throw new Error(message);
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    await firebaseSendEmailVerification(credentials.user);
    return buildAuthenticatedResponse(credentials.user);
  } catch (error: unknown) {
    const message = translateFirebaseError((error as { code?: string })?.code);
    throw new Error(message);
  }
};

export const getAccountInfo = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return { emailVerified: false, email: '' };
  }

  await reload(currentUser);

  return {
    emailVerified: currentUser.emailVerified,
    email: currentUser.email ?? '',
  };
};

export const sendEmailVerification = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Nenhum usuário autenticado para enviar verificação.');
  }

  await firebaseSendEmailVerification(currentUser);
};

export const signOutUser = async () => {
  await signOut(auth);
};
