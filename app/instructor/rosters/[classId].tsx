import { useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';

const formatSession = (dateString: string, location?: string) =>
  `${new Date(dateString).toLocaleString('pt-BR', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })}${location ? ` · ${location}` : ''}`;

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
};

export default function ClassRosterDetailScreen() {
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  const {
    classes,
    sessions,
    rosterByClass,
    toggleAttendance,
    updateEnrollmentStatus,
    reinstateClassForWeek,
  } = useInstructorData();
  const insets = useSafeAreaInsets();

  const trainingClass = classes.find((item) => item.id === classId);
  const roster = rosterByClass[classId ?? ''] ?? [];

  const nextSession = [...sessions]
    .filter((session) => session.classId === classId)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', onPress: onConfirm },
    ]);
  };

  const handleCheckIn = (
    sessionId: string,
    enrollmentId: string,
    status: 'present' | 'absent',
  ) => {
    const label = status === 'present' ? 'presença' : 'falta';
    confirmAction('Confirmar atualização', `Deseja marcar ${label} para este aluno?`, () => {
      toggleAttendance(sessionId, enrollmentId, status);
      Alert.alert('Registro salvo', `Check-in atualizado como ${label}.`);
    });
  };

  const handleDropStudent = (classIdToDrop: string, enrollmentId: string) => {
    const className = classes.find((item) => item.id === classIdToDrop)?.title ?? 'aula';
    Alert.alert(
      'Remover aluno',
      `Deseja remover o aluno desta turma de ${className}? Ele perderá acesso imediato.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            updateEnrollmentStatus(enrollmentId, 'cancelled');
            Alert.alert('Aluno removido', 'A inscrição foi cancelada com sucesso.');
          },
        },
      ],
    );
  };

  const handleReinstateCredit = (studentId: string) => {
    if (!nextSession) return;
    const weekStart = startOfWeek(new Date(nextSession.startTime));
    Alert.alert(
      'Repor aula da semana',
      'Deseja devolver 1 aula ao saldo semanal deste aluno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Repor crédito',
          onPress: () => {
            reinstateClassForWeek(studentId, weekStart, 1, 'Reposição manual pelo instrutor');
            Alert.alert('Crédito reposto', 'Adicionamos +1 aula disponível nesta semana.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['left', 'right', 'bottom']}>
      <TopBar title={trainingClass?.title ?? 'Lista da turma'} fallbackHref="/instructor/rosters" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {!trainingClass && (
          <ThemedText style={styles.muted}>Turma não encontrada.</ThemedText>
        )}

        {trainingClass && (
          <>
            <ThemedText type="title" style={styles.heading}>
              Inscritos na turma
            </ThemedText>
            <ThemedText style={styles.muted}>
              Gerencie presença e inscrições sem precisar rolar uma página longa.
            </ThemedText>

            <ThemedView style={styles.card}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
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
                <ThemedView style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{roster.length} alunos</ThemedText>
                </ThemedView>
              </View>

              <View style={styles.rosterList}>
                {roster.map((entry) => {
                  const paymentCleared = entry.paymentStatus === 'paid';
                  return (
                    <View key={entry.enrollment.id} style={styles.rosterRow}>
                      <View style={styles.rosterText}>
                        <ThemedText type="defaultSemiBold">{entry.student.fullName}</ThemedText>
                        <ThemedText style={styles.muted}>
                          {entry.enrollment.status === 'waitlist' ? 'Lista de espera' : 'Confirmado'} ·{' '}
                          {entry.paymentLabel === 'Pago'
                            ? 'sem pendências'
                            : `${entry.paymentLabel} · pagamento requerido`}
                        </ThemedText>
                      </View>
                      <View style={styles.rosterActions}>
                        <Pressable
                          style={[styles.checkButton, styles.presentButton]}
                          disabled={!nextSession || !paymentCleared}
                          onPress={() =>
                            nextSession && handleCheckIn(nextSession.id, entry.enrollment.id, 'present')
                          }>
                          <ThemedText style={styles.actionText}>Presente</ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.checkButton, styles.absentButton]}
                          disabled={!nextSession}
                          onPress={() =>
                            nextSession && handleCheckIn(nextSession.id, entry.enrollment.id, 'absent')
                          }>
                          <ThemedText style={[styles.actionText, styles.absentText]}>Falta</ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.checkButton, styles.reinstateButton]}
                          onPress={() => handleReinstateCredit(entry.student.id)}>
                          <ThemedText style={styles.actionText}>Repor semana</ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.checkButton, styles.removeButton]}
                          onPress={() => handleDropStudent(trainingClass.id, entry.enrollment.id)}>
                          <ThemedText style={[styles.actionText, styles.absentText]}>Remover</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                {roster.length === 0 && (
                  <ThemedText style={styles.muted}>Nenhum aluno inscrito ainda.</ThemedText>
                )}
              </View>
            </ThemedView>
          </>
        )}
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
    paddingBottom: 28,
    gap: 12,
  },
  heading: {
    marginBottom: 4,
  },
  muted: {
    opacity: 0.75,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#e9f4ff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#dff1ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    color: '#0b3b5a',
  },
  rosterList: {
    gap: 10,
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  rosterText: {
    flex: 1,
    gap: 4,
  },
  rosterActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  checkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presentButton: {
    backgroundColor: '#0e9aed',
    borderColor: '#0a6fa5',
  },
  absentButton: {
    backgroundColor: '#fff1f1',
    borderColor: '#ffb4b4',
  },
  reinstateButton: {
    backgroundColor: '#e7f6ff',
    borderColor: '#a8d9ff',
  },
  removeButton: {
    backgroundColor: '#ffe5e5',
    borderColor: '#ffb4b4',
  },
  actionText: {
    color: '#0b3b5a',
  },
  absentText: {
    color: '#a01717',
  },
});
