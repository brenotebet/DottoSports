import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function StopwatchScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Stopwatch & intervals
      </ThemedText>
      <ThemedText style={styles.muted}>
        A simple space for classic stopwatch timing or interval-based workouts. Functionality will
        be added soon.
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Classic stopwatch</ThemedText>
        <ThemedText style={styles.muted}>
          Track warm-ups or benchmark workouts with a basic timer and lap markers.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Interval builder</ThemedText>
        <ThemedText style={styles.muted}>
          Plan EMOM, Tabata, or custom work/rest blocks for classes and personal sessions.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  heading: {
    marginTop: 8,
  },
  muted: {
    opacity: 0.7,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
});
