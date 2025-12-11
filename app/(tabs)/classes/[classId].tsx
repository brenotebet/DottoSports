import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
    rosterByClass,
    ensureStudentProfile,
    enrollStudentInClass,
    getCapacityUsage,
    getEnrollmentForStudent,
  } = useInstructorData();

  const [statusMessage, setStatusMessage] = useState('');
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [totalPrice] = useState(120);

  const trainingClass = useMemo(() => classes.find((item) => item.id === classId), [classes, classId]);
  const capacity = useMemo(
    () => (classId ? getCapacityUsage(classId) : { active: 0, capacity: 0, available: 0 }),
    [classId, getCapacityUsage],
  );

  useEffect(() => {
    if (user) {
      const profile = ensureStudentProfile(user.email, user.displayName);
      setCurrentStudentId(profile.id);
    }
  }, [ensureStudentProfile, user]);

  const rosterEntries = useMemo(() => rosterByClass[classId ?? ''] ?? [], [classId, rosterByClass]);

  const existingEnrollment = useMemo(() => {
    if (!currentStudentId || !classId) return undefined;
    return getEnrollmentForStudent(currentStudentId, classId);
  }, [classId, currentStudentId, getEnrollmentForStudent]);

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', onPress: onConfirm },
    ]);
  };

  if (!trainingClass) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { paddingTop: insets.top + 8, paddingHorizontal: 20 }]}>
        <ThemedText style={styles.muted}>Aula não encontrada.</ThemedText>
      </SafeAreaView>
    );
  }

  const handleEnroll = () => {
    if (!currentStudentId) return;
    confirmAction('Confirmar inscrição', 'Tem certeza que deseja se inscrever nesta aula?', () => {
      const result = enrollStudentInClass(currentStudentId, trainingClass.id);
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
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 8 }]}>
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
          <ThemedText style={styles.priceRow}>
            Valor total estimado: <ThemedText type="defaultSemiBold">R$ {totalPrice.toFixed(2)}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.muted}>
            O pagamento é feito pelo menu em "Realizar pagamento" quando estiver disponível.
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
    flexWrap: 'wrap',
    alignItems: 'flex-start',
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
  priceRow: {
    marginTop: 4,
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
