import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, TextInput, TouchableWithoutFeedback, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível entrar agora.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const themeColors = Colors[colorScheme ?? 'light'];
  const inputBackground = colorScheme === 'dark' ? '#0f1720' : '#ffffff';
  const placeholderColor = colorScheme === 'dark' ? '#9ba3af' : '#8ca0ae';
  const textColor = themeColors.text;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.formContainer}>
          <ThemedText type="title" style={styles.title}>
            Entrar
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textColor }]}>Acesse com seu e-mail para continuar.</ThemedText>

          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="email@exemplo.com"
            placeholderTextColor={placeholderColor}
            style={[
              styles.input,
              { borderColor: themeColors.icon, backgroundColor: inputBackground, color: textColor },
            ]}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            autoComplete="password"
            placeholder="Senha"
            placeholderTextColor={placeholderColor}
            secureTextEntry
            style={[
              styles.input,
              { borderColor: themeColors.icon, backgroundColor: inputBackground, color: textColor },
            ]}
            value={password}
            onChangeText={setPassword}
          />

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <Pressable
            disabled={submitting}
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: submitting ? '#9fd4f8' : themeColors.tint,
                opacity: pressed ? 0.9 : 1,
              },
            ]}>
            {submitting ? (
              <ActivityIndicator color="#0b3b5a" />
            ) : (
              <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                Entrar
              </ThemedText>
            )}
          </Pressable>

          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: textColor }]}>Não tem conta?</ThemedText>
            <Link href="/(auth)/signup" asChild>
              <Pressable style={styles.footerButton}>
                <ThemedText type="defaultSemiBold" style={styles.footerButtonText}>
                  Cadastre-se
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </View>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formContainer: {
    gap: 16,
  },
  title: {
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    backgroundColor: '#ffffff',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0b3b5a',
  },
  errorText: {
    color: '#d9534f',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 15,
    lineHeight: 20,
  },
  footerButton: {
    backgroundColor: '#0e9aed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
  },
  footerButtonText: {
    color: '#0b3b5a',
  },
});
