import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const monthNames = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const dayIndexMap: Record<string, number> = {
  Dom: 0,
  Seg: 1,
  Ter: 2,
  Qua: 3,
  Qui: 4,
  Sex: 5,
  Sáb: 6,
};

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { sessions, classes } = useInstructorData();

  const firstPlannedDate = useMemo(() => {
    const dates: Date[] = [];

    classes.forEach((trainingClass) => {
      trainingClass.schedule.forEach((slot) => {
        if (slot.startDate) {
          dates.push(new Date(slot.startDate));
        }
      });
    });

    sessions.forEach((session) => dates.push(new Date(session.startTime)));

    if (dates.length === 0) return new Date();
    const earliest = dates.reduce((min, date) => (date < min ? date : min), dates[0]);
    return earliest;
  }, [classes, sessions]);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(firstPlannedDate.getFullYear(), firstPlannedDate.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(firstPlannedDate);

  useEffect(() => {
    setCurrentMonth(new Date(firstPlannedDate.getFullYear(), firstPlannedDate.getMonth(), 1));
    setSelectedDate(firstPlannedDate);
  }, [firstPlannedDate]);

  const recurringByDay = useMemo(() => {
    const map: Record<string, { classTitle: string; location: string; time: string }[]> = {};
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    classes.forEach((trainingClass) => {
      trainingClass.schedule.forEach((slot) => {
        const dayIndex = dayIndexMap[slot.day];
        if (dayIndex === undefined) return;

        const startRange = slot.startDate ? new Date(slot.startDate) : monthStart;
        const endRange = slot.endDate ? new Date(slot.endDate) : monthEnd;

        const rangeStart = new Date(Math.max(monthStart.getTime(), startRange.getTime()));
        const rangeEnd = new Date(Math.min(monthEnd.getTime(), endRange.getTime()));

        for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
          if (cursor.getDay() !== dayIndex) continue;

          const key = dateKey(cursor);
          if (!map[key]) map[key] = [];
          map[key].push({
            classTitle: trainingClass.title,
            location: slot.location,
            time: `${slot.start} - ${slot.end}`,
          });
        }
      });
    });

    return map;
  }, [classes, currentMonth]);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, { classTitle: string; location: string; time: string }[]> = Object.fromEntries(
      Object.entries(recurringByDay).map(([key, value]) => [key, [...value]]),
    );

    sessions.forEach((session) => {
      const sessionDate = new Date(session.startTime);
      const key = dateKey(sessionDate);
      const sessionClass = classes.find((item) => item.id === session.classId);
      const time = sessionDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push({
        classTitle: sessionClass?.title ?? 'Aula',
        location: session.location,
        time,
      });
    });
    return map;
  }, [classes, recurringByDay, sessions]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startOffset = (currentMonth.getDay() + 6) % 7; // segunda como início
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const calendarCells = useMemo(() => {
    return Array.from({ length: totalCells }).map((_, index) => {
      const dayNumber = index - startOffset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return null;
      }
      return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
    });
  }, [currentMonth, daysInMonth, startOffset, totalCells]);

  const selectedKey = dateKey(selectedDate);
  const classesForDay = sessionsByDay[selectedKey] ?? [];

  const handleMonthChange = (offset: number) => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(next);
    setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  const renderDayCell = (cellDate: Date | null, index: number) => {
    if (!cellDate) {
      return <View key={`empty-${index}`} style={[styles.dayCell, styles.dayCellEmpty]} />;
    }

    const key = dateKey(cellDate);
    const hasSessions = Boolean(sessionsByDay[key]?.length);
    const isSelected = key === selectedKey;

    return (
      <Pressable
        key={key}
        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
        onPress={() => setSelectedDate(cellDate)}>
        <ThemedText type="defaultSemiBold" style={isSelected && styles.selectedText}>
          {cellDate.getDate()}
        </ThemedText>
        {hasSessions && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Calendário mensal
        </ThemedText>
        <ThemedText style={styles.muted}>
          Visualize o mês inteiro e toque em um dia com aulas para ver os horários disponíveis.
        </ThemedText>

        <ThemedView style={styles.card}>
          <View style={styles.monthHeader}>
            <Pressable onPress={() => handleMonthChange(-1)} style={styles.monthButton}>
              <ThemedText type="defaultSemiBold">‹</ThemedText>
            </Pressable>
            <ThemedText type="subtitle" style={styles.monthTitle}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </ThemedText>
            <Pressable onPress={() => handleMonthChange(1)} style={styles.monthButton}>
              <ThemedText type="defaultSemiBold">›</ThemedText>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day) => (
              <ThemedText key={day} style={[styles.weekDay, styles.muted]}>
                {day}
              </ThemedText>
            ))}
          </View>

          <View style={styles.grid}>{calendarCells.map(renderDayCell)}</View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">
            {selectedDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </ThemedText>
          <ThemedText style={styles.muted}>
            {classesForDay.length > 0
              ? 'Toque em um dia diferente para ver outras aulas.'
              : 'Nenhuma aula marcada para este dia.'}
          </ThemedText>

          <View style={styles.scheduleList}>
            {classesForDay.map((item, index) => (
              <ThemedView key={`${selectedKey}-${index}`} style={styles.session}>
                <View>
                  <ThemedText type="defaultSemiBold">{item.classTitle}</ThemedText>
                  <ThemedText style={styles.muted}>{item.location}</ThemedText>
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
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#e9f4ff',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#d9eefe',
  },
  monthTitle: {
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
    gap: 6,
  },
  dayCellSelected: {
    backgroundColor: '#0e9aed',
  },
  dayCellEmpty: {
    opacity: 0.4,
  },
  selectedText: {
    color: '#fff',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0e9aed',
  },
  dotSelected: {
    backgroundColor: '#fff',
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
