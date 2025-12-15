import { Link } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';

export default function InstructorDashboardScreen() {
  const { sessions, classes, rosterByClass, toggleAttendance, updateEnrollmentStatus } =
    useInstructorData();
  const insets = useSafeAreaInsets();

  const upcomingSessions = sessions.slice(0, 3);
  const classRosterEntries = classes.map((trainingClass) => ({
    trainingClass,
    roster: rosterByClass[trainingClass.id] ?? [],
  }));

  const paymentHighlights = classRosterEntries
    .flatMap((item) => item.roster)
    .map((entry) => ({
      student: entry.student,
      status: entry.paymentStatus,
      label: entry.paymentLabel,
    }));

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

  const handleDropStudent = (classId: string, enrollmentId: string) => {
    const className = classes.find((item) => item.id === classId)?.title ?? 'aula';
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

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={[ 'left', 'right', 'bottom']}>
      <TopBar title="Painel do instrutor" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Monitoramento do box
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Sessões desta semana</ThemedText>
          {upcomingSessions.length === 0 && (
            <ThemedText style={styles.muted}>Nenhuma sessão agendada para esta semana.</ThemedText>
          )}
          {upcomingSessions.map((session) => {
            const sessionClass = classes.find((c) => c.id === session.classId);
            return (
              <ThemedView key={session.id} style={styles.sessionItem}>
                <View style={styles.sessionHeader}>
                  <View>
                    <ThemedText type="defaultSemiBold">{sessionClass?.title}</ThemedText>
                    <ThemedText style={styles.muted}>
                      {new Date(session.startTime).toLocaleString('pt-BR', {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {session.location}
                    </ThemedText>
                  </View>
                  <ThemedView style={styles.tagPill}>
                    <ThemedText type="defaultSemiBold" style={styles.tagPillText}>
                      Capacidade {session.capacity}
                    </ThemedText>
                  </ThemedView>
                </View>
                {session.tags && (
                  <View style={styles.tagRow}>
                    {session.tags.map((tag) => (
                      <ThemedView key={tag} style={styles.badge}>
                        <ThemedText style={styles.badgeText}>{tag}</ThemedText>
                      </ThemedView>
                    ))}
                  </View>
                )}
              </ThemedView>
            );
          })}
          <Link href="/instructor/classes" asChild>
            <Pressable style={styles.linkButton}>
              <ThemedText type="defaultSemiBold" style={styles.linkButtonText}>
                Gerenciar aulas e sessões
              </ThemedText>
            </Pressable>
          </Link>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Listas e check-in</ThemedText>
          {classRosterEntries.length === 0 && (
            <ThemedText style={styles.muted}>Cadastre aulas para acompanhar check-ins.</ThemedText>
          )}
          {classRosterEntries.map(({ trainingClass, roster }) => (
            <ThemedView key={trainingClass.id} style={styles.rosterCard}>
              <View style={styles.rosterHeader}>
                <View>
                  <ThemedText type="defaultSemiBold">{trainingClass.title}</ThemedText>
                  <ThemedText style={styles.muted}>
                    {trainingClass.schedule
                      .map(
                        (slot) =>
                          `${slot.day} ${slot.start}-${slot.end} (${slot.startDate ?? 'agora'} a ${slot.endDate ?? 'sem data fim'})`,
                      )
                      .join(' · ')}
                  </ThemedText>
                </View>
                <View style={styles.tagRow}>
                  {trainingClass.tags.map((tag) => (
                    <ThemedView key={`${trainingClass.id}-${tag}`} style={styles.badge}>
                      <ThemedText style={styles.badgeText}>{tag}</ThemedText>
                    </ThemedView>
                  ))}
                </View>
              </View>

              <View style={styles.rosterList}>
                {roster.map((entry) => {
                  const nextSession = sessions.find((session) => session.classId === trainingClass.id);
                  const paymentCleared = entry.paymentStatus === 'paid';
                  return (
                    <View key={entry.enrollment.id} style={styles.rosterRow}>
                      <View style={styles.rosterText}>
                        <ThemedText type="defaultSemiBold">{entry.student.fullName}</ThemedText>
                        <ThemedText style={styles.muted}>
                          {entry.enrollment.status === 'waitlist' ? 'Lista de espera' : 'Confirmado'} ·
                          {entry.paymentLabel === 'Pago'
                            ? ' sem pendências'
                            : ` ${entry.paymentLabel} · pagamento requerido`}
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
          ))}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Status de pagamento</ThemedText>
          <ThemedText style={styles.muted}>
            Acompanhe rapidamente quem está em dia, pendente ou com cobranças atrasadas.
          </ThemedText>
          <View style={styles.paymentList}>
            {paymentHighlights.length === 0 && (
              <ThemedText style={styles.muted}>Nenhum pagamento para monitorar agora.</ThemedText>
            )}
            {paymentHighlights.map((item) => (
              <View key={item.student.id} style={styles.paymentRow}>
                <View style={styles.rosterText}>
                  <ThemedText type="defaultSemiBold">{item.student.fullName}</ThemedText>
                  <ThemedText style={styles.muted}>{item.student.phone}</ThemedText>
                </View>
                <ThemedView
                  style={[
                    styles.paymentBadge,
                    item.status === 'paid' && styles.paymentBadgePaid,
                    item.status === 'overdue' && styles.paymentBadgeOverdue,
                  ]}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={item.status === 'paid' ? styles.paymentBadgePaidText : styles.paymentBadgeText}>
                    {item.label}
                  </ThemedText>
                </ThemedView>
                <Link href="/(tabs)/menu" asChild>
                  <Pressable style={styles.paymentLink}>
                    <ThemedText type="defaultSemiBold" style={styles.paymentLinkText}>
                      Ir para cobrança
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
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
    paddingBottom: 28,
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
  sessionItem: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f4faff',
    gap: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  tagPill: {
    backgroundColor: '#0e9aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagPillText: {
    color: '#fff',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
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
  linkButton: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#0e9aed',
  },
  linkButtonText: {
    color: '#0b3b5a',
  },
  muted: {
    opacity: 0.72,
  },
  rosterCard: {
    backgroundColor: '#f4faff',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
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
  paymentList: {
    gap: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#fff8e5',
  },
  paymentBadgePaid: {
    backgroundColor: '#e7f8ed',
  },
  paymentBadgeOverdue: {
    backgroundColor: '#ffe5e5',
  },
  paymentBadgeText: {
    color: '#ad6c00',
  },
  paymentBadgePaidText: {
    color: '#157347',
  },
  paymentLink: {
    marginLeft: 'auto',
    backgroundColor: '#0e9aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  paymentLinkText: {
    color: '#0b3b5a',
  },
});
