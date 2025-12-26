// [classId].tsx
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useInstructorData } from '@/providers/instructor-data-provider';

export const options = { headerShown: false };

export default function ClassDetailsScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { user, hasRole } = useAuth();
  const {
    classes,
    rosterByClass,
    ensureStudentProfile,
    enrollStudentInClass,
    getCapacityUsage,
    getEnrollmentForStudent,
    cancelEnrollment,
    sessions,
    getWeeklyUsageForStudent,
    bookSessionForStudent,
    isSessionBooked,
    getActivePlanForStudent,
    getStudentAccountSnapshot,
  } = useInstructorData();

  const [statusMessage, setStatusMessage] = useState('');
  const insets = useSafeAreaInsets();
  const isInstructorView = hasRole(['INSTRUCTOR', 'ADMIN']);
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!user) return;
    void ensureStudentProfile(user.email, user.displayName);
  }, [ensureStudentProfile, user]);

  const trainingClass = useMemo(() => classes.find((item) => item.id === classId), [classes, classId]);

  const capacity = useMemo(
    () => (classId ? getCapacityUsage(classId) : { active: 0, capacity: 0, available: 0 }),
    [classId, getCapacityUsage],
  );

  const rosterEntries = useMemo(() => rosterByClass[classId ?? ''] ?? [], [classId, rosterByClass]);

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((s) => s.classId === classId)
      .filter((s) => new Date(s.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [classId, sessions]);

  const existingEnrollment = useMemo(() => {
    if (!uid || !classId) return undefined;
    const enrollment = getEnrollmentForStudent(uid, classId);
    return enrollment?.status === 'cancelled' ? undefined : enrollment;
  }, [classId, uid, getEnrollmentForStudent]);

  const currentWeekUsage = useMemo(
    () => (uid ? getWeeklyUsageForStudent(uid) : null),
    [uid, getWeeklyUsageForStudent],
  );

  const activePlan = useMemo(() => (uid ? getActivePlanForStudent(uid) : undefined), [uid, getActivePlanForStudent]);

  const studentAccount = useMemo(() => (uid ? getStudentAccountSnapshot(uid) : null), [uid, getStudentAccountSnapshot]);

  const hasOutstandingBalance = (studentAccount?.openBalance ?? 0) > 0;
  const nextDueDate = studentAccount?.nextPayment?.payment?.dueDate ?? null;

  const remainingThisWeek = currentWeekUsage?.remaining ?? 0;

  const canEnroll = Boolean(uid && activePlan && remainingThisWeek > 0 && !existingEnrollment && !hasOutstandingBalance);

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', onPress: onConfirm },
    ]);
  };

  if (!trainingClass) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.container}>
          <ThemedText style={styles.muted}>Aula não encontrada.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const handleEnroll = () => {
    if (!uid) return;

    if (hasOutstandingBalance) {
      Alert.alert(
        'Pagamento pendente',
        nextDueDate
          ? `Você possui cobranças em aberto. Regularize até ${nextDueDate} para liberar inscrições.`
          : 'Você possui cobranças em aberto. Regularize para liberar inscrições.',
      );
      return;
    }

    confirmAction('Confirmar inscrição', 'Tem certeza que deseja se inscrever nesta aula?', () => {
      void (async () => {
        try {
          const result = await enrollStudentInClass(uid, trainingClass.id);
          if (result.alreadyEnrolled) {
            const message = 'Você já está inscrito nesta aula.';
            setStatusMessage(message);
            Alert.alert('Nenhuma alteração', message);
            return;
          }

          if (result.isWaitlist) {
            const message = 'Capacidade cheia. Você entrou na lista de espera.';
            setStatusMessage(message);
            Alert.alert('Inscrição processada', message);
          } else {
            const message = 'Inscrição confirmada! Você já tem vaga nesta turma.';
            setStatusMessage(message);
            Alert.alert('Inscrição confirmada', message);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Não foi possível concluir a inscrição.';
          setStatusMessage(message);
          Alert.alert('Inscrição bloqueada', message);
        }
      })();
    });
  };

  const handleBookSession = (sessionId: string, referenceDate: Date) => {
    if (!uid) return;

    if (hasOutstandingBalance) {
      Alert.alert(
        'Pagamento pendente',
        nextDueDate
          ? `Você possui cobranças em aberto. Regularize até ${nextDueDate} para liberar reservas.`
          : 'Você possui cobranças em aberto. Regularize para liberar reservas.',
      );
      return;
    }

    void (async () => {
      try {
        await bookSessionForStudent(sessionId, uid);
        const usage = getWeeklyUsageForStudent(uid, referenceDate);
        const message = `Reserva confirmada. Restam ${usage.remaining} aulas esta semana.`;
        setStatusMessage(message);
        Alert.alert('Reserva confirmada', message);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível reservar esta sessão.';
        Alert.alert('Limite atingido', message);
      }
    })();
  };

  const handleUnregister = () => {
    if (!existingEnrollment) return;
    confirmAction('Cancelar inscrição', 'Deseja sair desta turma? Cancelaremos cobranças futuras.', () => {
      void (async () => {
        await cancelEnrollment(existingEnrollment.id);
        const message = 'Inscrição cancelada. Você pode se inscrever novamente quando quiser.';
        setStatusMessage(message);
        Alert.alert('Inscrição cancelada', message);
      })();
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]} edges={['left', 'right', 'bottom']}>
      <TopBar title="Detalhes da aula" fallbackHref="/(tabs)/classes" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          {trainingClass.title}
        </ThemedText>
        <ThemedText style={styles.muted}>{trainingClass.description}</ThemedText>

        <ThemedView style={styles.cardPrimary}>
          <View style={styles.rowBetween}>
            <ThemedView style={styles.capacityPill}>
              <ThemedText type="defaultSemiBold" style={styles.capacityText}>
                {capacity.available} vagas restantes
              </ThemedText>
            </ThemedView>
            <View style={styles.tagRow}>
              {trainingClass.tags.map((tag) => (
                <ThemedView key={`${trainingClass.id}-${tag}`} style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{tag}</ThemedText>
                </ThemedView>
              ))}
            </View>
          </View>
          <ThemedText style={styles.muted}>
            {trainingClass.schedule
              .map(
                (slot) =>
                  `${slot.day} ${slot.start}-${slot.end} · ${slot.location} (${slot.startDate ?? 'início imediato'} até ${slot.endDate ?? 'sem data final'})`,
              )
              .join('  •  ')}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Limites do plano</ThemedText>
          <ThemedText style={styles.muted}>
            Use seu saldo semanal para reservar horários. Aulas avulsas custam R$ 79,00 (&quot;Dia adicional&quot; do
            cardápio).
          </ThemedText>
          <View style={styles.usageRow}>
            <ThemedText type="title">
              {currentWeekUsage ? `${currentWeekUsage.used}/${currentWeekUsage.limit}` : '--/--'}
            </ThemedText>
            <ThemedText style={styles.muted}>reservas nesta semana</ThemedText>
          </View>

          {hasOutstandingBalance ? (
            <ThemedView style={styles.gateBox}>
              <ThemedText type="defaultSemiBold">Acesso bloqueado por pagamento pendente</ThemedText>
              <ThemedText style={styles.muted}>
                {nextDueDate
                  ? `Regularize até ${nextDueDate} para liberar inscrições e reservas.`
                  : 'Regularize para liberar inscrições e reservas.'}
              </ThemedText>
              <Link href="/payments" asChild>
                <Pressable style={styles.gateButton}>
                  <ThemedText type="defaultSemiBold" style={styles.gateButtonText}>
                    Ir para pagamentos
                  </ThemedText>
                </Pressable>
              </Link>
            </ThemedView>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Inscrição</ThemedText>
          <ThemedText style={styles.muted}>
            As reservas usam apenas seu saldo semanal de aulas do plano ativo. Não geramos cobranças extras na inscrição.
          </ThemedText>

          <Pressable
            style={[styles.primaryButton, !canEnroll && styles.primaryButtonDisabled]}
            onPress={handleEnroll}
            disabled={!canEnroll}>
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              {existingEnrollment ? 'Inscrito' : 'Inscrever nesta aula'}
            </ThemedText>
          </Pressable>

          {!activePlan && (
            <ThemedText style={styles.muted}>Adquira um plano para se inscrever e reservar horários.</ThemedText>
          )}

          {activePlan && remainingThisWeek <= 0 && !hasOutstandingBalance && (
            <ThemedText style={styles.muted}>
              Limite semanal atingido. Você poderá se inscrever novamente na próxima semana ou ao reforçar seu plano.
            </ThemedText>
          )}

          {existingEnrollment ? (
            <Pressable style={styles.secondaryButton} onPress={handleUnregister}>
              <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                Cancelar inscrição
              </ThemedText>
            </Pressable>
          ) : null}

          {statusMessage ? <ThemedText style={styles.statusText}>{statusMessage}</ThemedText> : null}

          {existingEnrollment && (
            <ThemedText style={styles.muted}>
              Status atual: {existingEnrollment.status === 'waitlist' ? 'Lista de espera' : 'Confirmado'}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Próximos horários</ThemedText>
          <ThemedText style={styles.muted}>Escolha horários nesta semana respeitando o seu limite de aulas contratadas.</ThemedText>

          <View style={{ gap: 10 }}>
            {upcomingSessions.map((session) => {
              const sessionDate = new Date(session.startTime);
              const usage = uid ? getWeeklyUsageForStudent(uid, sessionDate) : null;
              const booked = uid ? isSessionBooked(session.id, uid) : false;
              const remaining = usage?.remaining ?? 0;

              const canBook = Boolean(uid && !hasOutstandingBalance && !booked && remaining > 0);

              return (
                <ThemedView key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionRowCompact}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">
                        {sessionDate.toLocaleString('pt-BR', {
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </ThemedText>
                      <ThemedText style={styles.muted}>{session.location}</ThemedText>
                      <ThemedText style={styles.muted}>
                        Semana: {usage?.weekStart?.slice(0, 10) ?? '--'} · Uso:{' '}
                        {usage ? `${usage.used}/${usage.limit}` : '--'}
                      </ThemedText>
                    </View>

                    <Pressable
                      style={[styles.primaryButton, !canBook && styles.primaryButtonDisabled]}
                      disabled={!canBook}
                      onPress={() => handleBookSession(session.id, sessionDate)}>
                      <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                        {booked
                          ? 'Já reservado'
                          : hasOutstandingBalance
                            ? 'Pagamento pendente'
                            : remaining <= 0
                              ? 'Limite da semana'
                              : 'Reservar'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              );
            })}

            {upcomingSessions.length === 0 && <ThemedText style={styles.muted}>Nenhuma sessão agendada para esta turma.</ThemedText>}
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Quem já está inscrito</ThemedText>
          <View style={styles.rosterList}>
            {rosterEntries.map((entry) => (
              <View key={entry.enrollment.id} style={styles.rosterRow}>
                <View style={{ gap: 4 }}>
                  <ThemedText type="defaultSemiBold">{entry.student.fullName}</ThemedText>
                  <ThemedText style={styles.muted}>
                    {isInstructorView
                      ? entry.paymentLabel
                      : entry.enrollment.status === 'waitlist'
                        ? 'Lista de espera'
                        : 'Inscrição confirmada'}
                  </ThemedText>
                </View>
                <ThemedView style={styles.badge}>
                  <ThemedText style={styles.badgeText}>
                    {entry.enrollment.status === 'waitlist' ? 'Espera' : 'Ativo'}
                  </ThemedText>
                </ThemedView>
              </View>
            ))}

            {rosterEntries.length === 0 && <ThemedText style={styles.muted}>Ainda não temos inscrições para esta aula.</ThemedText>}
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, gap: 14 },
  heading: { marginBottom: 4 },
  cardPrimary: { borderRadius: 14, padding: 16, gap: 10, backgroundColor: '#0e9aed' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' },
  capacityPill: { backgroundColor: '#022a4c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  capacityText: { color: '#e9f6ff' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: '#e6f2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { textTransform: 'capitalize' },
  muted: { opacity: 0.75 },
  card: { borderRadius: 14, padding: 16, gap: 10, backgroundColor: '#f5f9ff', borderWidth: 1, borderColor: '#dce9f5' },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  gateBox: {
    marginTop: 10,
    backgroundColor: '#fff5e5',
    borderWidth: 1,
    borderColor: '#ffd8a8',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  gateButton: {
    marginTop: 6,
    backgroundColor: '#094f7d',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  gateButtonText: { color: '#fff' },

  primaryButton: { backgroundColor: '#0e9aed', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#022a4c' },
  primaryButtonDisabled: { backgroundColor: '#c9e5f7' },

  secondaryButton: { marginTop: 8, backgroundColor: '#f4f6f8', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#d3d9e2' },
  secondaryButtonText: { color: '#0b3b5a' },
  statusText: { marginTop: 6, color: '#0b3b5a' },

  sessionCard: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#dbe8f4' },
  sessionRowCompact: { flexDirection: 'row', gap: 10, alignItems: 'center' },

  rosterList: { gap: 10 },
  rosterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
});
