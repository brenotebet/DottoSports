import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useInstructorData } from '@/providers/instructor-data-provider';

export default function ClassDetailsScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    classes,
    sessions,
    rosterByClass,
    ensureStudentProfile,
    enrollStudentInClass,
    getCapacityUsage,
    getEnrollmentForStudent,
    recordCheckIn,
    chargeStoredCard,
    createOneTimePayment,
    cardOnFile,
  } = useInstructorData();

  const [statusMessage, setStatusMessage] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [checkInMessage, setCheckInMessage] = useState('');
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  const trainingClass = useMemo(() => classes.find((item) => item.id === classId), [classes, classId]);
  const capacity = useMemo(() => (classId ? getCapacityUsage(classId) : { active: 0, capacity: 0, available: 0 }), [classId, getCapacityUsage]);

  useEffect(() => {
    if (user) {
      const profile = ensureStudentProfile(user.email, user.displayName);
      setCurrentStudentId(profile.id);
    }
  }, [ensureStudentProfile, user]);

  const rosterEntries = useMemo(() => rosterByClass[classId ?? ''] ?? [], [classId, rosterByClass]);
  const nextSession = useMemo(() => {
    if (!classId) return null;
    return sessions
      .filter((session) => session.classId === classId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  }, [classId, sessions]);

  const existingEnrollment = useMemo(() => {
    if (!currentStudentId || !classId) return undefined;
    return getEnrollmentForStudent(currentStudentId, classId);
  }, [classId, currentStudentId, getEnrollmentForStudent]);

  if (!trainingClass) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
        <ThemedText style={styles.muted}>Aula não encontrada.</ThemedText>
      </SafeAreaView>
    );
  }

  const handleEnroll = () => {
    if (!currentStudentId) return;
    const result = enrollStudentInClass(currentStudentId, trainingClass.id);
    if (result.alreadyEnrolled) {
      setStatusMessage('Você já está inscrito nesta aula.');
      return;
    }

    if (result.isWaitlist) {
      setStatusMessage('Capacidade cheia. Você entrou na lista de espera.');
    } else {
      setStatusMessage('Inscrição confirmada! Você já tem vaga nesta turma.');
    }
  };

  const handleChargeCard = () => {
    if (!currentStudentId) return;
    const payment = chargeStoredCard(
      currentStudentId,
      95,
      `Pagamento único para ${trainingClass.title}`,
    );
    setPaymentMessage(`Cobrança realizada (${payment.description}).`);
  };

  const handleOneTimePayment = () => {
    if (!currentStudentId) return;
    const payment = createOneTimePayment(
      currentStudentId,
      120,
      'pix',
      `Pagamento avulso para ${trainingClass.title}`,
    );
    setPaymentMessage(
      payment.status === 'paid'
        ? 'Pagamento confirmado automaticamente.'
        : 'Pagamento gerado. Aguarde confirmação.',
    );
  };

  const handleCheckIn = (method: 'qr' | 'manual') => {
    if (!existingEnrollment || !nextSession) {
      setCheckInMessage('Faça a inscrição e aguarde uma sessão válida para registrar presença.');
      return;
    }
    const attendance = recordCheckIn(nextSession.id, existingEnrollment.id, method);
    setCheckInMessage(`Check-in registrado (${attendance.notes}).`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
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
            {trainingClass.schedule.map((slot) => `${slot.day} ${slot.start}-${slot.end} · ${slot.location}`).join('  •  ')}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Inscrição</ThemedText>
          <ThemedText style={styles.muted}>
            Para confirmar sua vaga precisamos vincular sua conta e respeitar a capacidade da turma.
          </ThemedText>
          <Pressable style={styles.primaryButton} onPress={handleEnroll} disabled={!currentStudentId}>
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              {existingEnrollment ? 'Atualizar inscrição' : 'Inscrever nesta aula'}
            </ThemedText>
          </Pressable>
          {statusMessage ? <ThemedText style={styles.statusText}>{statusMessage}</ThemedText> : null}
          {existingEnrollment && (
            <ThemedText style={styles.muted}>
              Status atual: {existingEnrollment.status === 'waitlist' ? 'Lista de espera' : 'Confirmado'}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Pagamento e checkout</ThemedText>
          <ThemedText style={styles.muted}>
            Use o cartão em arquivo para cobranças rápidas ou gere um pagamento avulso.
          </ThemedText>
          <ThemedView style={styles.cardOnFile}>
            <ThemedText type="defaultSemiBold">{cardOnFile.label}</ThemedText>
            <ThemedText style={styles.muted}>
              Validade {cardOnFile.expMonth}/{cardOnFile.expYear} · {cardOnFile.brand}
            </ThemedText>
          </ThemedView>
          <View style={styles.rowBetween}>
            <Pressable style={styles.secondaryButton} onPress={handleChargeCard}>
              <ThemedText type="defaultSemiBold" style={styles.secondaryText}>
                Cobrar R$ 95
              </ThemedText>
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={handleOneTimePayment}>
              <ThemedText type="defaultSemiBold" style={styles.outlineText}>
                Gerar pagamento avulso
              </ThemedText>
            </Pressable>
          </View>
          {paymentMessage ? <ThemedText style={styles.statusText}>{paymentMessage}</ThemedText> : null}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Check-in rápido</ThemedText>
          <ThemedText style={styles.muted}>
            Confirme presença com QR Code ou manualmente. O registro é salvo na sua inscrição.
          </ThemedText>
          {nextSession ? (
            <ThemedText style={styles.muted}>
              Próxima sessão: {new Date(nextSession.startTime).toLocaleString('pt-BR', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {nextSession.location}
            </ThemedText>
          ) : (
            <ThemedText style={styles.muted}>Nenhuma sessão futura configurada.</ThemedText>
          )}
          <View style={styles.rowBetween}>
            <Pressable style={styles.secondaryButton} onPress={() => handleCheckIn('qr')}>
              <ThemedText type="defaultSemiBold" style={styles.secondaryText}>
                Escanear QR
              </ThemedText>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => handleCheckIn('manual')}>
              <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                Check-in manual
              </ThemedText>
            </Pressable>
          </View>
          {checkInMessage ? <ThemedText style={styles.statusText}>{checkInMessage}</ThemedText> : null}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Quem já está inscrito</ThemedText>
          <View style={styles.rosterList}>
            {rosterEntries.map((entry) => (
              <View key={entry.enrollment.id} style={styles.rosterRow}>
                <View style={{ gap: 4 }}>
                  <ThemedText type="defaultSemiBold">{entry.student.fullName}</ThemedText>
                  <ThemedText style={styles.muted}>{entry.paymentLabel}</ThemedText>
                </View>
                <ThemedView style={styles.badge}>
                  <ThemedText style={styles.badgeText}>
                    {entry.enrollment.status === 'waitlist' ? 'Espera' : 'Ativo'}
                  </ThemedText>
                </ThemedView>
              </View>
            ))}
            {rosterEntries.length === 0 && (
              <ThemedText style={styles.muted}>Ainda não temos inscrições para esta aula.</ThemedText>
            )}
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
    gap: 14,
  },
  heading: {
    marginBottom: 4,
  },
  cardPrimary: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: '#0e9aed',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  capacityPill: {
    backgroundColor: '#022a4c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  capacityText: {
    color: '#e9f6ff',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: '#e6f2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    textTransform: 'capitalize',
  },
  muted: {
    opacity: 0.75,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: '#f5f9ff',
    borderWidth: 1,
    borderColor: '#dce9f5',
  },
  primaryButton: {
    backgroundColor: '#0e9aed',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#022a4c',
  },
  secondaryButton: {
    backgroundColor: '#e5f3ff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  secondaryText: {
    color: '#0b3b5a',
    textAlign: 'center',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#0e9aed',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  outlineText: {
    color: '#0e426a',
    textAlign: 'center',
  },
  cardOnFile: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#e6f2ff',
    gap: 4,
  },
  statusText: {
    marginTop: 6,
    color: '#0b3b5a',
  },
  rosterList: {
    gap: 10,
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
});
