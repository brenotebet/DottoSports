import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function StopwatchScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Cronômetro e intervalos
        </ThemedText>
        <ThemedText style={styles.muted}>
          Espaço para marcar tempo clássico ou sessões com blocos de trabalho e descanso. A
          funcionalidade completa chegará em breve.
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Cronômetro clássico</ThemedText>
          <ThemedText style={styles.muted}>
            Acompanhe aquecimentos ou benchmarks com marcação de voltas e tempo total.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Criador de intervalos</ThemedText>
          <ThemedText style={styles.muted}>
            Monte EMOM, Tabata ou blocos personalizados de esforço e descanso para aula ou treino
            solo.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  heading: {
    marginBottom: 4,
  },
  muted: {
    opacity: 0.82,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
    backgroundColor: '#e9f4ff',
  },
});
