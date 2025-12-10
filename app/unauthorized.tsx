import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function UnauthorizedScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Acesso restrito
        </ThemedText>
        <ThemedText style={styles.message}>
          Sua conta não possui permissão para acessar esta área. Entre com um perfil de administrador ou instrutor ou volte para
          o painel.
        </ThemedText>
        <Pressable style={styles.button} onPress={() => router.replace('/(tabs)')}>
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            Voltar ao início
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#e9f4ff',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0e9aed',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0b3b5a',
  },
});
