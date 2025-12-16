import { Link, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { useInstructorData } from '@/providers/instructor-data-provider';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    sessions,
    classes,
    ensureStudentProfile,
    getEnrollmentForStudent,
    recordCheckIn,
    getCapacityUsage,
    getStudentAccountSnapshot,
    getActivePlanForStudent,
    getWeeklyUsageForStudent,
    sessionBookings,
    planOptions,
    goals,
  } = useInstructorData();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const profile = ensureStudentProfile(user.email, user.displayName);
      setStudentId(profile.id);
    }
  }, [ensureStudentProfile, user]);

  const studentAccount = useMemo(
    () => (studentId ? getStudentAccountSnapshot(studentId) : null),
    [getStudentAccountSnapshot, studentId],
  );

  const studentEnrollments = useMemo(
    () => studentAccount?.enrollments ?? [],
    [studentAccount],
  );

  const bookingsForStudent = useMemo(
    () =>
      studentId
        ? sessionBookings.filter(
            (booking) => booking.studentId === studentId && booking.status === 'booked',
          )
        : [],
    [sessionBookings, studentId],
  );

  const upcomingBookedSession = useMemo(() => {
    const now = Date.now();
    const bookedSessions = bookingsForStudent
      .map((booking) => sessions.find((session) => session.id === booking.sessionId))
      .filter((session): session is (typeof sessions)[number] => Boolean(session));

    const future = bookedSessions
      .filter((session) => new Date(session.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const ordered = future.length > 0 ? future : bookedSessions;
    return ordered[0] ?? null;
  }, [bookingsForStudent, sessions]);

  const upcomingSession = useMemo(() => {
    if (upcomingBookedSession) return upcomingBookedSession;
    if (studentEnrollments.length === 0) return null;

    const enrolledClassIds = new Set(studentEnrollments.map((item) => item.classId));
    const now = Date.now();

    const futureSessions = sessions
      .filter((session) => enrolledClassIds.has(session.classId) && new Date(session.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (futureSessions.length > 0) return futureSessions[0];
    const allSessions = sessions
      .filter((session) => enrolledClassIds.has(session.classId))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return allSessions[0] ?? null;
  }, [sessions, studentEnrollments, upcomingBookedSession]);

  const sessionClass = useMemo(
    () => classes.find((item) => item.id === upcomingSession?.classId),
    [classes, upcomingSession?.classId],
  );

  const sessionCapacity = useMemo(
    () => (upcomingSession?.classId ? getCapacityUsage(upcomingSession.classId) : null),
    [getCapacityUsage, upcomingSession?.classId],
  );

  const upcomingSessionDescription = useMemo(() => {
    if (!upcomingSession) return null;
    const formattedDate = new Date(upcomingSession.startTime).toLocaleString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${sessionClass?.title ?? 'Aula inscrita'} · ${formattedDate}`;
  }, [sessionClass?.title, upcomingSession]);

  const enrollment = useMemo(() => {
    if (!studentId || !upcomingSession) return null;
    return getEnrollmentForStudent(studentId, upcomingSession.classId) ?? null;
  }, [getEnrollmentForStudent, studentId, upcomingSession]);

  const nextPayment = studentAccount?.nextPayment;

  const activePlan = useMemo(
    () => (studentId ? getActivePlanForStudent(studentId) : undefined),
    [getActivePlanForStudent, studentId],
  );

  const activePlanOption = useMemo(
    () => planOptions.find((option) => option.id === activePlan?.planOptionId),
    [activePlan?.planOptionId, planOptions],
  );

  const weeklyUsage = useMemo(
    () => (studentId ? getWeeklyUsageForStudent(studentId) : null),
    [getWeeklyUsageForStudent, studentId],
  );

  const activeGoals = useMemo(
    () =>
      goals
        .filter((goal) => goal.studentId === studentId && goal.status === 'active')
        .slice(0, 3),
    [goals, studentId],
  );

  const highlights: { label: string; value: string; href?: Href }[] = [
    { label: 'Aulas inscritas', value: `${studentEnrollments.length} turmas`, href: '/classes/registered' },
    {
      label: 'Próxima cobrança',
      value: nextPayment ? `Vence ${nextPayment.payment.dueDate}` : 'Nenhuma pendente',
    },
    {
      label: 'Check-in rápido',
      value:
        upcomingSessionDescription ??
        (studentEnrollments.length > 0
          ? 'Sem aulas inscritas no momento'
          : 'Precisa inscrever'),
    },
  ];
  const hasEnrollments = studentEnrollments.length > 0;
  const canCheckIn = Boolean(enrollment && upcomingSession);

  const handleQuickCheckIn = () => {
    if (!studentId || !upcomingSession || !enrollment) {
      const message = 'Inscreva-se primeiro para habilitar o check-in.';
      setCheckInStatus(message);
      Alert.alert('Check-in indisponível', message);
      return;
    }

    Alert.alert('Confirmar check-in rápido', 'Tem certeza que deseja registrar presença agora?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim',
        onPress: () => {
          try {
            recordCheckIn(upcomingSession.id, enrollment.id, 'manual');
            const message = 'Check-in confirmado. Sua aula começará em breve.';
            setCheckInStatus(message);
            Alert.alert('Check-in concluído', message);
          } catch (error) {
            const fallback = 'Não foi possível registrar o check-in.';
            const message = error instanceof Error ? error.message : fallback;
            setCheckInStatus(message);
            Alert.alert('Pagamento requerido', message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Bem-vindo(a) de volta!
        </ThemedText>

        <ThemedView style={styles.cardPrimary}>
          <ThemedText type="subtitle" style={styles.cardPrimaryText}>Próxima aula</ThemedText>
          <ThemedText type="title" style={[styles.titleSpacing, styles.cardPrimaryText]}>
            {sessionClass?.title ?? 'Sem aulas próximas'}
          </ThemedText>
          <ThemedText style={styles.cardPrimaryText}>
            {upcomingSession
              ? `${new Date(upcomingSession.startTime).toLocaleString('pt-BR', {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })} · ${upcomingSession.location}`
              : hasEnrollments
                ? 'Nenhuma sessão agendada para suas turmas.'
                : 'Adicione aulas pelo catálogo.'}
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={[styles.muted, styles.cardPrimaryText]}>
            {sessionCapacity && sessionClass
              ? `Capacidade ${sessionCapacity.available} / ${sessionCapacity.capacity}`
              : sessionClass
                ? `Capacidade ${sessionClass.capacity}`
                : 'Nenhuma turma ativa'}
          </ThemedText>
          <ThemedText style={[styles.cardPrimaryText, styles.muted]}>
            {upcomingSessionDescription ?? 'Nenhuma aula inscrita para check-in.'}
          </ThemedText>
          <View style={styles.rowActions}>
            <Link href="/(tabs)/classes" asChild>
              <Pressable style={[styles.checkInButton, { backgroundColor: '#094f7d' }]}>
                <ThemedText type="defaultSemiBold" style={styles.checkInText}>
                  Ver catálogo
                </ThemedText>
              </Pressable>
            </Link>
            {canCheckIn ? (
              <Pressable
                style={[styles.checkInButton, { backgroundColor: '#022a4c' }]}
                onPress={handleQuickCheckIn}>
                <ThemedText type="defaultSemiBold" style={styles.checkInText}>
                  Check-in rápido
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
          {!hasEnrollments ? (
            <ThemedText style={[styles.cardPrimaryText, styles.muted]}>
              Nenhuma inscrição ativa. Veja o catálogo para escolher uma aula.
            </ThemedText>
          ) : null}
          {checkInStatus ? (
            <ThemedText style={[styles.cardPrimaryText, styles.muted]}>{checkInStatus}</ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Seu plano</ThemedText>
          {activePlanOption ? (
            <>
              <ThemedText type="title" style={styles.titleSpacing}>
                {activePlanOption.weeklyClasses}x na semana · {activePlanOption.durationMonths} meses
              </ThemedText>
              <ThemedText style={styles.muted}>
                {weeklyUsage ? `${weeklyUsage.remaining} aulas disponíveis nesta semana` : 'Calculando uso semanal...'}
              </ThemedText>
              <ThemedText style={styles.muted}>
                {nextPayment ? `Próximo vencimento em ${nextPayment.payment.dueDate}` : 'Cobranças em dia.'}
              </ThemedText>
              <View style={styles.planActions}>
                <Link href="/account" asChild>
                  <Pressable style={styles.managePlanButton}>
                    <ThemedText type="defaultSemiBold" style={styles.managePlanText}>Gerenciar plano</ThemedText>
                  </Pressable>
                </Link>
              </View>
            </>
          ) : (
            <>
              <ThemedText style={styles.muted}>
                Você ainda não escolheu um plano. Selecione sua quantidade de aulas semanais para habilitar as
                reservas.
              </ThemedText>
              <Link href="/account" asChild>
                <Pressable style={styles.managePlanButton}>
                  <ThemedText type="defaultSemiBold" style={styles.managePlanText}>Escolher plano</ThemedText>
                </Pressable>
              </Link>
            </>
          )}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Metas em andamento</ThemedText>
          {activeGoals.length === 0 ? (
            <ThemedText style={styles.muted}>
              Cadastre uma meta em Avaliações físicas para acompanhar seu progresso.
            </ThemedText>
          ) : (
            <View style={styles.goalsList}>
              {activeGoals.map((goal) => (
                <View key={goal.id} style={styles.goalRow}>
                  <View style={styles.goalHeader}>
                    <ThemedText type="defaultSemiBold">{goal.target}</ThemedText>
                    <ThemedText style={styles.muted}>{goal.metric}</ThemedText>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(goal.progress, 100)}%` }]} />
                  </View>
                  <ThemedText style={styles.muted}>{goal.progress}% concluído</ThemedText>
                </View>
              ))}
            </View>
          )}
        </ThemedView>

        <ThemedView style={styles.row}>
          <ThemedView style={[styles.card, styles.flexItem]}>
            <ThemedText type="subtitle">Próximo pagamento</ThemedText>
            <ThemedText type="title" style={styles.titleSpacing}>
              {nextPayment ? `R$ ${nextPayment.payment.amount.toFixed(2)}` : 'Nenhum valor aberto'}
            </ThemedText>
            <ThemedText>
              {nextPayment ? `Vencimento ${nextPayment.payment.dueDate}` : 'Tudo em dia no momento.'}
            </ThemedText>
          </ThemedView>
          <ThemedView style={[styles.card, styles.flexItem]}>
            <ThemedText type="subtitle">Cronômetro</ThemedText>
            <ThemedText style={styles.muted}>Intervalos e timer clássico</ThemedText>
            <Link href="/stopwatch" asChild>
              <Pressable style={styles.iconLink}>
                <IconSymbol
                  name="stopwatch.fill"
                  color={Colors[colorScheme ?? 'light'].tint}
                  size={28}
                />
                <ThemedText type="defaultSemiBold">Abrir</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.card}> 
          <ThemedText type="subtitle">Resumo rápido</ThemedText>
          <View style={styles.highlightGrid}>
            {highlights.map((item) => (
              item.href ? (
                <Link key={item.label} href={item.href} asChild>
                  <Pressable style={[styles.highlightItem, styles.highlightInteractive]}>
                    <ThemedText type="defaultSemiBold">{item.value}</ThemedText>
                    <ThemedText style={styles.muted}>{item.label}</ThemedText>
                  </Pressable>
                </Link>
              ) : (
                <ThemedView key={item.label} style={styles.highlightItem}>
                  <ThemedText type="defaultSemiBold">{item.value}</ThemedText>
                  <ThemedText style={styles.muted}>{item.label}</ThemedText>
                </ThemedView>
              )
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
    gap: 8,
    backgroundColor: '#e9f4ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPrimary: {
    borderRadius: 16,
    padding: 18,
    gap: 8,
    backgroundColor: '#0e9aed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPrimaryText: {
    color: '#e9f6ff',
  },
  titleSpacing: {
    marginTop: 4,
    marginBottom: 4,
  },
  muted: {
    opacity: 0.82,
  },
  checkInButton: {
    backgroundColor: '#022a4c',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  rowActions: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 10,
  },
  checkInText: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  flexItem: {
    flex: 1,
    minWidth: '48%',
  },
  iconLink: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  highlightGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 12,
  },
  highlightItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f8ff',
    gap: 6,
  },
  highlightInteractive: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c2d9ef',
  },
  goalsList: {
    gap: 10,
  },
  goalRow: {
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 10,
    backgroundColor: '#dcecf9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#0e9aed',
  },
  planActions: {
    marginTop: 10,
  },
  managePlanButton: {
    marginTop: 8,
    backgroundColor: '#022a4c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  managePlanText: {
    color: '#fff',
  },
});
