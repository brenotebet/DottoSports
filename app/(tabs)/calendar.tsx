import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const schedule = {
  'Mon 11': [
    { time: '6:00 AM', title: 'Strength Foundations', coach: 'Coach Liza' },
    { time: '7:30 PM', title: 'Engine Builder', coach: 'Coach Ken' },
  ],
  'Tue 12': [
    { time: '6:30 AM', title: 'Gymnastics Skills', coach: 'Coach Emi' },
    { time: '6:00 PM', title: 'Metcon Madness', coach: 'Coach Quinn' },
  ],
  'Wed 13': [
    { time: '12:00 PM', title: 'Lift Heavy', coach: 'Coach Sam' },
    { time: '6:30 PM', title: 'Partner WOD', coach: 'Coach Rosa' },
  ],
  'Thu 14': [
    { time: '5:45 AM', title: 'Conditioning', coach: 'Coach Leo' },
    { time: '6:15 PM', title: 'Olympic Lifting', coach: 'Coach Sky' },
  ],
  'Fri 15': [
    { time: '6:00 AM', title: 'Sprint Intervals', coach: 'Coach Nate' },
    { time: '5:30 PM', title: 'Open Gym', coach: 'Supervisor on duty' },
  ],
};

export default function CalendarScreen() {
  const days = useMemo(() => Object.keys(schedule), []);
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const dayClasses = schedule[selectedDay];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Class calendar
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
        <ThemedText type="subtitle">{selectedDay} schedule</ThemedText>
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
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dayChipActive: {
    backgroundColor: '#0f766e',
  },
  dayChipTextActive: {
    color: '#fff',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  scheduleList: {
    gap: 12,
  },
  session: {
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: {
    opacity: 0.7,
  },
});
