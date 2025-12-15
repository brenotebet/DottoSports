import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useInstructorData } from '@/providers/instructor-data-provider';

export const options = { headerShown: false };

export default function RegisteredClassesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { classes, sessions, enrollments, ensureStudentProfile } = useInstructorData();
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const profile = ensureStudentProfile(user.email, user.displayName);
      setStudentId(profile.id);
    }
  }, [ensureStudentProfile, user]);

  const studentEnrollments = useMemo(
    () =>
      enrollments.filter(
        (enrollment) => enrollment.studentId === studentId && enrollment.status !== 'cancelled',
      ),
    [enrollments, studentId],
  );

  const enrolledClasses = useMemo(
    () =>
      studentEnrollments
        .map((enrollment) => ({
          enrollment,
          trainingClass: classes.find((item) => item.id === enrollment.classId),
        }))
        .filter((item) => item.trainingClass !== undefined),
    [classes, studentEnrollments],
  );

  const resolveNextSession = (classId: string) => {
    const now = Date.now();
    const futureSessions = sessions
      .filter((session) => session.classId === classId && new Date(session.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (futureSessions.length > 0) return futureSessions[0];

    return sessions
      .filter((session) => session.classId === classId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Minhas aulas
        </ThemedText>
        <ThemedText style={styles.leadText}>
          Revise suas inscrições, confira o próximo horário e acesse os detalhes da turma com um toque.
        </ThemedText>

        <View style={styles.list}>
          {enrolledClasses.map(({ trainingClass, enrollment }) => {
            if (!trainingClass) return null;

            const nextSession = resolveNextSession(trainingClass.id);

            return (
              <Link key={trainingClass.id} href={`/classes/${trainingClass.id}`} asChild>
                <Pressable style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleBlock}>
                      <ThemedText type="subtitle">{trainingClass.title}</ThemedText>
                      <ThemedText style={styles.muted}>{trainingClass.description}</ThemedText>
                    </View>
                    <ThemedView style={styles.statusPill}>
                      <ThemedText type="defaultSemiBold" style={styles.statusText}>
                        {enrollment.status === 'waitlist' ? 'Lista de espera' : 'Inscrito'}
                      </ThemedText>
                    </ThemedView>
                  </View>

                  <ThemedText style={styles.metaText}>
                    Categoria: {trainingClass.category} · Nível: {trainingClass.level}
                  </ThemedText>

                  {nextSession ? (
                    <ThemedView style={styles.sessionRow}>
                      <ThemedText type="defaultSemiBold">Próxima sessão</ThemedText>
                      <ThemedText>
                        {new Date(nextSession.startTime).toLocaleString('pt-BR', {
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {nextSession.location}
                      </ThemedText>
                    </ThemedView>
                  ) : null}
                </Pressable>
              </Link>
            );
          })}

          {enrolledClasses.length === 0 ? (
            <ThemedView style={styles.emptyCard}>
              <ThemedText style={styles.muted}>Você ainda não está inscrito em nenhuma aula.</ThemedText>
              <Link href="/(tabs)/classes" asChild>
                <Pressable style={styles.resetButton}>
                  <ThemedText type="defaultSemiBold" style={styles.resetButtonText}>
                    Ver catálogo
                  </ThemedText>
                </Pressable>
              </Link>
            </ThemedView>
          ) : null}
        </View>
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
  leadText: {
    opacity: 0.75,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#f5f9ff',
    gap: 10,
    borderWidth: 1,
    borderColor: '#dce9f5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#0e9aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
  },
  metaText: {
    color: '#063b5e',
  },
  sessionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
    gap: 4,
  },
  muted: {
    opacity: 0.68,
  },
  emptyCard: {
    marginTop: 8,
    gap: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#e9f4ff',
  },
  resetButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0e9aed',
  },
  resetButtonText: {
    color: '#0b3b5a',
  },
});
