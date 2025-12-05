import { useEffect, useMemo, useState } from 'react';
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
import { onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '@/lib/firebase';

const errorMessages: Record<string, string> = {
  'auth/invalid-credential': 'Credenciais inválidas. Confira e tente novamente.',
  'auth/invalid-email': 'Formato de e-mail inválido.',
  'auth/missing-password': 'Digite sua senha para continuar.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.',
  'auth/user-disabled': 'Conta desativada. Fale com o administrador.',
  'auth/user-not-found': 'Usuário não encontrado. Crie uma conta primeiro.',
  'auth/wrong-password': 'Senha incorreta.',
};

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.emailVerified) {
        router.replace('/(tabs)');
      }
    });

    return unsubscribe;
  }, [router]);

  const parseError = (firebaseError: unknown) => {
    if (firebaseError instanceof FirebaseError) {
      return errorMessages[firebaseError.code] ?? 'Não foi possível entrar. Tente novamente.';
    }

    return 'Não foi possível entrar. Tente novamente.';
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    try {
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password);

      if (!credentials.user.emailVerified) {
        await sendEmailVerification(credentials.user);
        setStatus('E-mail não verificado. Reenviamos o link para confirmar sua conta.');
        await signOut(auth);
        return;
      }

      setStatus('Login realizado. Redirecionando...');
      router.replace('/(tabs)');
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
          Entrar
        </ThemedText>
        <ThemedText style={styles.subtitle}>Use seu e-mail e senha para acessar.</ThemedText>

        <ThemedView style={[styles.card, { backgroundColor: backgroundColor.card, borderColor: backgroundColor.border }]}>
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
              placeholder="••••••••"
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
            onPress={handleLogin}
          >
            {loading ? <ActivityIndicator color="#0d2136" /> : <ThemedText style={styles.buttonText}>Entrar</ThemedText>}
          </Pressable>
        </ThemedView>

        <View style={styles.footer}>
          <ThemedText>Não tem conta?</ThemedText>
          <Link href="/signup" asChild>
            <Pressable>
              <ThemedText type="link">Criar conta</ThemedText>
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
