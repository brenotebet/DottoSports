import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

const errorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'Este e-mail já está em uso. Tente outro.',
  'auth/invalid-email': 'Formato de e-mail inválido.',
  'auth/operation-not-allowed': 'Cadastro desabilitado. Fale com o administrador.',
  'auth/weak-password': 'Use uma senha com pelo menos 6 caracteres.',
};

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const backgroundColor = useMemo(
    () => ({
      card: colorScheme === 'dark' ? '#0f1b29' : '#ffffff',
      input: colorScheme === 'dark' ? '#162435' : '#f3f7fb',
      border: colorScheme === 'dark' ? '#26384d' : '#d5e3f0',
    }),
    [colorScheme],
  );

  const parseError = (firebaseError: unknown) => {
    if (firebaseError instanceof FirebaseError) {
      return errorMessages[firebaseError.code] ?? 'Não foi possível criar a conta. Tente novamente.';
    }

    return 'Não foi possível criar a conta. Tente novamente.';
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      setLoading(false);
      return;
    }

    try {
      const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (name.trim()) {
        await updateProfile(credentials.user, { displayName: name.trim() });
      }

      await setDoc(
        doc(db, 'users', credentials.user.uid),
        {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          createdAt: serverTimestamp(),
          emailVerified: false,
        },
        { merge: true },
      );

      await sendEmailVerification(credentials.user);
      await signOut(auth);
      setStatus('Conta criada! Enviamos um e-mail para confirmar seu endereço. Verifique sua caixa de entrada.');
      router.replace('/login');
    } catch (authError) {
      setError(parseError(authError));
    } finally {
      setLoading(false);
    }
  };

  const tint = Colors[colorScheme ?? 'light'].tint;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          Criar conta
        </ThemedText>
        <ThemedText style={styles.subtitle}>Cadastre-se para acompanhar seus treinos.</ThemedText>

        <ThemedView style={[styles.card, { backgroundColor: backgroundColor.card, borderColor: backgroundColor.border }]}>
          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Nome completo</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Como devemos chamar você?"
              placeholderTextColor="#7a8aa0"
              autoCapitalize="words"
              autoComplete="name"
              style={[
                styles.input,
                { backgroundColor: backgroundColor.input, borderColor: backgroundColor.border, color: Colors[colorScheme ?? 'light'].text },
              ]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">E-mail</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#7a8aa0"
              autoCapitalize="none"
              keyboardType="email-address"
              inputMode="email"
              autoComplete="email"
              style={[
                styles.input,
                { backgroundColor: backgroundColor.input, borderColor: backgroundColor.border, color: Colors[colorScheme ?? 'light'].text },
              ]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Senha</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Crie uma senha segura"
              placeholderTextColor="#7a8aa0"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              style={[
                styles.input,
                { backgroundColor: backgroundColor.input, borderColor: backgroundColor.border, color: Colors[colorScheme ?? 'light'].text },
              ]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Confirmar senha</ThemedText>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repita a senha"
              placeholderTextColor="#7a8aa0"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              style={[
                styles.input,
                { backgroundColor: backgroundColor.input, borderColor: backgroundColor.border, color: Colors[colorScheme ?? 'light'].text },
              ]}
            />
          </View>

          {error ? (
            <ThemedText style={styles.error}>{error}</ThemedText>
          ) : null}
          {status ? (
            <ThemedText style={styles.status}>{status}</ThemedText>
          ) : null}

          <Pressable
            style={[styles.button, { backgroundColor: loading ? '#9ecdf5' : tint }]}
            disabled={loading}
            onPress={handleSignup}
          >
            {loading ? (
              <ActivityIndicator color="#0d2136" />
            ) : (
              <ThemedText style={styles.buttonText}>Criar conta</ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <View style={styles.footer}>
          <ThemedText>Já tem conta?</ThemedText>
          <Link href="/login" asChild>
            <Pressable>
              <ThemedText type="link">Entrar</ThemedText>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    marginTop: 12,
  },
  subtitle: {
    opacity: 0.8,
  },
  card: {
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldGroup: {
    gap: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0d2136',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#d72638',
  },
  status: {
    color: '#0f7d4c',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
});
