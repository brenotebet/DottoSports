import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';

const formatSession = (dateString: string, location?: string) =>
  `${new Date(dateString).toLocaleDateString('pt-BR', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })}${location ? ` · ${location}` : ''}`;

export default function ClassRosterListScreen() {
  const { classes, rosterByClass, sessions } = useInstructorData();
  const insets = useSafeAreaInsets();

  const getNextSessionForClass = (classId: string) =>
    [...sessions]
      .filter((session) => session.classId === classId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['left', 'right', 'bottom']}>
      <TopBar title="Listas e check-ins" fallbackHref="/instructor/dashboard" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Selecione uma turma
        </ThemedText>
        <ThemedText style={styles.muted}>
          Acompanhe presença e status de inscrições de cada turma em uma tela dedicada.
        </ThemedText>

        <ThemedView style={styles.card}>
          {classes.length === 0 && (
            <ThemedText style={styles.muted}>Nenhuma aula cadastrada até o momento.</ThemedText>
          )}

          {classes.map((trainingClass) => {
            const roster = rosterByClass[trainingClass.id] ?? [];
            const nextSession = getNextSessionForClass(trainingClass.id);

            return (
              <Link
                key={trainingClass.id}
                href={`/instructor/rosters/${trainingClass.id}`}
                asChild>
                <Pressable style={styles.listItem}>
                  <View style={styles.listText}>
                    <ThemedText type="defaultSemiBold">{trainingClass.title}</ThemedText>
                    <ThemedText style={styles.muted}>
                      {trainingClass.schedule
                        .map(
                          (slot) =>
                            `${slot.day} ${slot.start}-${slot.end} (${slot.startDate ?? 'início imediato'} a ${slot.endDate ?? 'sem data final'})`,
                        )
                        .join(' · ')}
                    </ThemedText>
                    {nextSession && (
                      <ThemedText style={styles.muted}>
                        Próxima sessão: {formatSession(nextSession.startTime, nextSession.location)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.metaRow}>
                    <ThemedView style={styles.badge}>
                      <ThemedText style={styles.badgeText}>{roster.length} inscritos</ThemedText>
                    </ThemedView>
                    <View style={styles.tagRow}>
                      {trainingClass.tags.map((tag) => (
                        <ThemedView key={`${trainingClass.id}-${tag}`} style={styles.tagBadge}>
                          <ThemedText style={styles.tagText}>{tag}</ThemedText>
                        </ThemedView>
                      ))}
                    </View>
                  </View>
                </Pressable>
              </Link>
            );
          })}
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
    gap: 12,
  },
  heading: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    padding: 12,
    gap: 10,
    backgroundColor: '#e9f4ff',
  },
  muted: {
    opacity: 0.75,
  },
  listItem: {
    backgroundColor: '#f4faff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  listText: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#dff1ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: '#0b3b5a',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tagText: {
    color: '#0b3b5a',
  },
});
