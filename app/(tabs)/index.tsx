import { Link } from 'expo-router';
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
  const { sessions, classes, payments, enrollments, ensureStudentProfile, getEnrollmentForStudent, recordCheckIn } =
    useInstructorData();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const profile = ensureStudentProfile(user.email, user.displayName);
      setStudentId(profile.id);
    }
  }, [ensureStudentProfile, user]);

  const upcomingSession = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  }, [sessions]);

  const sessionClass = useMemo(
    () => classes.find((item) => item.id === upcomingSession?.classId),
    [classes, upcomingSession?.classId],
  );

  const enrollment = useMemo(() => {
    if (!studentId || !upcomingSession) return null;
    return getEnrollmentForStudent(studentId, upcomingSession.classId) ?? null;
  }, [getEnrollmentForStudent, studentId, upcomingSession]);

  const nextPayment = useMemo(() => {
    if (!studentId) return null;
    return payments
      .filter((payment) => payment.studentId === studentId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }, [payments, studentId]);

  const highlights = [
    { label: 'Aulas inscritas', value: `${enrollments.filter((item) => item.studentId === studentId).length} turmas` },
    { label: 'Próxima cobrança', value: nextPayment ? `Vence ${nextPayment.dueDate}` : 'Nenhuma pendente' },
    {
      label: 'Check-in rápido',
      value: enrollment ? (enrollment.status === 'waitlist' ? 'Na espera' : 'Liberado') : 'Precisa inscrever',
    },
  ];

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
            const message = 'Presença registrada para a próxima sessão.';
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
              : 'Adicione aulas pelo catálogo.'}
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={[styles.muted, styles.cardPrimaryText]}>
            {sessionClass ? `Capacidade ${sessionClass.capacity}` : 'Nenhuma turma ativa'}
          </ThemedText>
          <View style={styles.rowActions}>
            <Link href="/(tabs)/classes" asChild>
              <Pressable style={[styles.checkInButton, { backgroundColor: '#094f7d' }]}>
                <ThemedText type="defaultSemiBold" style={styles.checkInText}>
                  Ver catálogo
                </ThemedText>
              </Pressable>
            </Link>
            <Pressable
              style={[styles.checkInButton, { backgroundColor: '#022a4c' }]}
              onPress={handleQuickCheckIn}>
              <ThemedText type="defaultSemiBold" style={styles.checkInText}>
                Check-in rápido
              </ThemedText>
            </Pressable>
          </View>
          {checkInStatus ? (
            <ThemedText style={[styles.cardPrimaryText, styles.muted]}>{checkInStatus}</ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.row}>
          <ThemedView style={[styles.card, styles.flexItem]}>
            <ThemedText type="subtitle">Próximo pagamento</ThemedText>
            <ThemedText type="title" style={styles.titleSpacing}>
              {nextPayment ? `R$ ${nextPayment.amount.toFixed(2)}` : 'Nenhum valor aberto'}
            </ThemedText>
            <ThemedText>
              {nextPayment ? `Vencimento ${nextPayment.dueDate}` : 'Tudo em dia no momento.'}
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
              <ThemedView key={item.label} style={styles.highlightItem}>
                <ThemedText type="defaultSemiBold">{item.value}</ThemedText>
                <ThemedText style={styles.muted}>{item.label}</ThemedText>
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
    marginTop: 10,
    backgroundColor: '#022a4c',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
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
    flexWrap: 'wrap',
    gap: 12,
  },
  highlightItem: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f8ff',
    gap: 6,
  },
});
