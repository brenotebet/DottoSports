import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const { signup } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateBirthDate = (value: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(value.trim());
  const normalizeCpf = (value: string) => value.replace(/\D/g, '');

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    let formatted = day;
    if (month) {
      formatted = `${formatted}/${month}`;
    }
    if (year) {
      formatted = `${formatted}/${year}`;
    }

    return formatted;
  };

  const formatCpf = (value: string) => {
    const digits = normalizeCpf(value).slice(0, 11);
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);

    let formatted = part1;
    if (part2) {
      formatted = `${formatted}.${part2}`;
    }
    if (part3) {
      formatted = `${formatted}.${part3}`;
    }
    if (part4) {
      formatted = `${formatted}-${part4}`;
    }

    return formatted;
  };

  const onSubmit = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedBirthDate = birthDate.trim();
    const normalizedCpf = normalizeCpf(cpf);
    const trimmedEmail = email.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedBirthDate || !normalizedCpf || !trimmedEmail) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!validateBirthDate(trimmedBirthDate)) {
      setError('Use o formato DD/MM/AAAA para a data de nascimento.');
      return;
    }

    if (normalizedCpf.length !== 11) {
      setError('Digite um CPF válido com 11 dígitos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas precisam ser iguais.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await signup({
        email: trimmedEmail,
        password,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        birthDate: trimmedBirthDate,
        cpf: normalizedCpf,
      });
      setSuccessMessage(`Enviamos um e-mail de verificação para ${trimmedEmail}. Confirme para acessar sua conta.`);
      setFirstName('');
      setLastName('');
      setBirthDate('');
      setCpf('');
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <ThemedView style={[styles.innerContainer, { backgroundColor: themeColors.background }]}>
            <View style={styles.formContainer}>
              <ThemedText type="title" style={styles.title}>
                Criar conta
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: textColor }]}>Use seu e-mail para se registrar.</ThemedText>

              <TextInput
                autoComplete="name"
                placeholder="Nome"
                placeholderTextColor={placeholderColor}
                style={[
                  styles.input,
                  { borderColor: themeColors.icon, backgroundColor: inputBackground, color: textColor },
                ]}
                value={firstName}
                onChangeText={setFirstName}
              />

              <TextInput
                autoComplete="name"
                placeholder="Sobrenome"
                placeholderTextColor={placeholderColor}
                style={[
                  styles.input,
                  { borderColor: themeColors.icon, backgroundColor: inputBackground, color: textColor },
                ]}
                value={lastName}
                onChangeText={setLastName}
              />

              <TextInput
                autoComplete="off"
                keyboardType="number-pad"
                placeholder="Data de nascimento (DD/MM/AAAA)"
                placeholderTextColor={placeholderColor}
                style={[
                  styles.input,
                  { borderColor: themeColors.icon, backgroundColor: inputBackground, color: textColor },
                ]}
                value={birthDate}
                onChangeText={(value) => setBirthDate(formatBirthDate(value))}
                maxLength={10}
              />

              <TextInput
                autoComplete="off"
                keyboardType="numeric"
                placeholder="CPF"
                placeholderTextColor={placeholderColor}
                style={[
                  styles.input,
                  { borderColor: themeColors.icon, backgroundColor: inputBackground, color: textColor },
                ]}
                value={cpf}
                onChangeText={(value) => setCpf(formatCpf(value))}
                maxLength={14}
              />

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
                <Link href="/(auth)/login" asChild>
                  <Pressable style={styles.footerButton}>
                    <ThemedText type="defaultSemiBold" style={styles.footerButtonText}>
                      Entrar
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
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
