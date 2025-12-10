import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, TextInput, TouchableWithoutFeedback, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const { signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    if (password !== confirmPassword) {
      setError('As senhas precisam ser iguais.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await signup(email, password);
      setSuccessMessage(`Enviamos um e-mail de verificação para ${email.trim()}. Confirme para acessar sua conta.`);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível criar sua conta.';
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
            Criar conta
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textColor }]}>Use seu e-mail para se registrar.</ThemedText>

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

          <TextInput
            autoComplete="password"
            placeholder="Confirme a senha"
            placeholderTextColor={placeholderColor}
            secureTextEntry
            style={[
              styles.input,
              { borderColor: themeColors.icon, backgroundColor: inputBackground, color: textColor },
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          {successMessage ? <ThemedText style={styles.successText}>{successMessage}</ThemedText> : null}

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
                Cadastrar
              </ThemedText>
            )}
          </Pressable>

          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: textColor }]}>Já tem conta?</ThemedText>
            <Link href="/(auth)/login" style={[styles.footerLink, { color: themeColors.tint }]}>Entrar</Link>
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
  successText: {
    color: '#0f9d58',
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
  footerLink: {
    fontWeight: '700',
  },
});
