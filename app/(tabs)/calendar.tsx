import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const schedule = {
  'Seg 11': [
    { time: '06:00', title: 'Força Base', coach: 'Coach Liza' },
    { time: '19:30', title: 'Engine Builder', coach: 'Coach Ken' },
  ],
  'Ter 12': [
    { time: '06:30', title: 'Habilidades de Ginástica', coach: 'Coach Emi' },
    { time: '18:00', title: 'Metcon Intensivo', coach: 'Coach Quinn' },
  ],
  'Qua 13': [
    { time: '12:00', title: 'Levantamento Pesado', coach: 'Coach Sam' },
    { time: '18:30', title: 'Treino em Dupla', coach: 'Coach Rosa' },
  ],
  'Qui 14': [
    { time: '05:45', title: 'Condicionamento', coach: 'Coach Leo' },
    { time: '18:15', title: 'Levantamento Olímpico', coach: 'Coach Sky' },
  ],
  'Sex 15': [
    { time: '06:00', title: 'Sprints e Intervalos', coach: 'Coach Nate' },
    { time: '17:30', title: 'Open Box', coach: 'Supervisor de plantão' },
  ],
};

export default function CalendarScreen() {
  const days = useMemo(
    () => Object.keys(schedule) as Array<keyof typeof schedule>,
    [],
  );
  const [selectedDay, setSelectedDay] = useState<keyof typeof schedule>(days[0]);
  const dayClasses = schedule[selectedDay];
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Calendário de aulas
        </ThemedText>

        <View style={styles.dayRow}>
          {days.map((day) => {
            const isActive = selectedDay === day;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayChip, isActive && styles.dayChipActive]}>
                <ThemedText type="defaultSemiBold" style={isActive && styles.dayChipTextActive}>
                  {day}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Agenda de {selectedDay}</ThemedText>
          <View style={styles.scheduleList}>
            {dayClasses.map((item) => (
              <ThemedView key={`${item.time}-${item.title}`} style={styles.session}>
                <View>
                  <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                  <ThemedText style={styles.muted}>{item.coach}</ThemedText>
                </View>
                <ThemedText type="defaultSemiBold">{item.time}</ThemedText>
              </ThemedView>
            ))}
          </View>
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
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e5f3ff',
  },
  dayChipActive: {
    backgroundColor: '#0e9aed',
  },
  dayChipTextActive: {
    color: '#fff',
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#e9f4ff',
  },
  scheduleList: {
    gap: 12,
  },
  session: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f4faff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: {
    opacity: 0.7,
  },
});
