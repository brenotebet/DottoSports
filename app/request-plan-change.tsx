import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';

export const options = { headerShown: false };

export default function RequestPlanChangeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['left', 'right', 'bottom']}>
      <TopBar title="Solicitar alteração de plano" fallbackHref="/account" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Como solicitar</ThemedText>
          <ThemedText style={styles.muted}>
            Para alterar seu plano antes do fim do período contratado, fale diretamente com nosso atendimento. Assim
            conseguimos ajustar corretamente o seu limite semanal e o faturamento.
          </ThemedText>

          <ThemedView style={styles.infoBox}>
            <ThemedText type="defaultSemiBold">Atendimento</ThemedText>
            <ThemedText style={styles.muted}>WhatsApp: +55 (11) 99999-9999</ThemedText>
            <ThemedText style={styles.muted}>Email: suporte@suaacademia.com</ThemedText>
            <ThemedText style={styles.muted}>Horário: Seg–Sex, 09:00–18:00</ThemedText>
          </ThemedView>

          <ThemedText style={styles.muted}>
            Dica: envie seu nome completo e o plano desejado (ex.: “3x por semana, 3 meses”) para agilizar.
          </ThemedText>

          <Link href="/account" asChild>
            <Pressable style={styles.primaryButton}>
              <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                Voltar para conta
              </ThemedText>
            </Pressable>
          </Link>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { paddingHorizontal: 20, paddingBottom: 28, gap: 16 },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#f5f9ff',
    borderWidth: 1,
    borderColor: '#dce9f5',
  },
  infoBox: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe8f5',
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: '#022a4c',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#e9f6ff' },
  muted: { opacity: 0.78 },
});
