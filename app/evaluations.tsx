import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useInstructorData } from '@/providers/instructor-data-provider';

export const options = { headerShown: false };

const formatHeight = (meters?: number, centimeters?: number) => {
  if (meters === undefined && centimeters === undefined) return null;
  const safeMeters = meters ?? 0;
  const safeCentimeters = centimeters ?? 0;
  return `${safeMeters}.${safeCentimeters.toString().padStart(2, '0')} m`;
};

export default function StudentEvaluationsScreen() {
  const { user, hasRole } = useAuth();
  const { getStudentProfileForEmail, getStudentEvaluations } = useInstructorData();
  const [studentId, setStudentId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user) {
      const profile = getStudentProfileForEmail(user.email, user.displayName);
      setStudentId(profile.id);
    }
  }, [getStudentProfileForEmail, user]);

  const evaluations = useMemo(
    () => (studentId ? getStudentEvaluations(studentId) : []),
    [getStudentEvaluations, studentId],
  );

  const latest = evaluations[0];

  if (!hasRole('STUDENT')) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
        edges={['top', 'left', 'right', 'bottom']}>
        <TopBar title="Minhas avaliações" />
        <View style={[styles.container, { flex: 1, justifyContent: 'center' }]}>
          <ThemedText type="title" style={styles.heading}>
            Área dedicada aos clientes
          </ThemedText>
          <ThemedText style={styles.muted}>
            Instrutores e administradores podem gerenciar avaliações pelo menu de instrutor.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['top', 'left', 'right', 'bottom']}>
      <TopBar title="Minhas avaliações" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.cardPrimary}>
          <ThemedText type="subtitle" style={styles.cardPrimaryText}>
            Acompanhamento personalizado
          </ThemedText>
          <ThemedText type="title" style={[styles.cardPrimaryText, styles.titleSpacing]}>
            {latest ? 'Veja seu histórico de avaliações' : 'Aguardando sua primeira avaliação'}
          </ThemedText>
          <ThemedText style={[styles.cardPrimaryText, styles.muted]}>
            {latest
              ? 'Revise suas respostas iniciais e acompanhe cada reavaliação enviada pelo instrutor.'
              : 'Seu treinador registrará a avaliação inicial na primeira sessão e ela aparecerá aqui.'}
          </ThemedText>
        </ThemedView>

        {latest ? (
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Última avaliação</ThemedText>
            <View style={styles.metaRow}>
              <ThemedText type="defaultSemiBold">Data</ThemedText>
              <ThemedText>{latest.date}</ThemedText>
            </View>
            <View style={styles.metaRow}>
              <ThemedText type="defaultSemiBold">Foco atual</ThemedText>
              <ThemedText>{latest.questionnaire.goalsFocus || 'Sem foco informado'}</ThemedText>
            </View>
            <View style={styles.metaRow}>
              <ThemedText type="defaultSemiBold">Frequência</ThemedText>
              <ThemedText>{latest.questionnaire.trainingFrequency || '—'}</ThemedText>
            </View>
            {latest.questionnaire.weightKg ? (
              <View style={styles.metaRow}>
                <ThemedText type="defaultSemiBold">Peso</ThemedText>
                <ThemedText>{latest.questionnaire.weightKg} kg</ThemedText>
              </View>
            ) : null}
            {formatHeight(latest.questionnaire.heightMeters, latest.questionnaire.heightCentimeters) ? (
              <View style={styles.metaRow}>
                <ThemedText type="defaultSemiBold">Altura</ThemedText>
                <ThemedText>
                  {formatHeight(latest.questionnaire.heightMeters, latest.questionnaire.heightCentimeters)}
                </ThemedText>
              </View>
            ) : null}
            {latest.notes ? (
              <View style={styles.noteBox}>
                <ThemedText type="defaultSemiBold">Observações do instrutor</ThemedText>
                <ThemedText style={styles.muted}>{latest.notes}</ThemedText>
              </View>
            ) : null}
          </ThemedView>
        ) : null}

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Histórico completo</ThemedText>
          {evaluations.length === 0 ? (
            <ThemedText style={styles.muted}>Nenhuma avaliação registrada ainda.</ThemedText>
          ) : (
            <View style={styles.list}>
              {evaluations.map((evaluation) => (
                <ThemedView key={evaluation.id} style={styles.listItem}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <ThemedText type="defaultSemiBold">{evaluation.date}</ThemedText>
                    <ThemedText style={styles.mutedSmall}>
                      Foco: {evaluation.questionnaire.goalsFocus || 'não informado'}
                    </ThemedText>
                    <ThemedText style={styles.mutedSmall}>
                      Frequência: {evaluation.questionnaire.trainingFrequency || '—'}
                    </ThemedText>
                    {evaluation.questionnaire.mobility ? (
                      <ThemedText style={styles.mutedSmall}>
                        Mobilidade: {evaluation.questionnaire.mobility}
                      </ThemedText>
                    ) : null}
                    {evaluation.questionnaire.nutrition ? (
                      <ThemedText style={styles.mutedSmall}>
                        Nutrição: {evaluation.questionnaire.nutrition}
                      </ThemedText>
                    ) : null}
                    {evaluation.questionnaire.sleepQuality ? (
                      <ThemedText style={styles.mutedSmall}>
                        Sono: {evaluation.questionnaire.sleepQuality}
                      </ThemedText>
                    ) : null}
                    {evaluation.questionnaire.stressLevel ? (
                      <ThemedText style={styles.mutedSmall}>
                        Estresse: {evaluation.questionnaire.stressLevel}
                      </ThemedText>
                    ) : null}
                    {evaluation.questionnaire.weightKg ? (
                      <ThemedText style={styles.mutedSmall}>
                        Peso: {evaluation.questionnaire.weightKg} kg
                      </ThemedText>
                    ) : null}
                    {formatHeight(
                      evaluation.questionnaire.heightMeters,
                      evaluation.questionnaire.heightCentimeters,
                    ) ? (
                      <ThemedText style={styles.mutedSmall}>
                        Altura:{' '}
                        {formatHeight(
                          evaluation.questionnaire.heightMeters,
                          evaluation.questionnaire.heightCentimeters,
                        )}
                      </ThemedText>
                    ) : null}
                    {evaluation.notes ? (
                      <ThemedText style={styles.mutedSmall}>Anotações: {evaluation.notes}</ThemedText>
                    ) : null}
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
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
  cardPrimary: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: '#022a4c',
  },
  cardPrimaryText: {
    color: '#fff',
  },
  titleSpacing: {
    marginTop: 6,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#e9f4ff',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  noteBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c2d9ef',
    gap: 6,
  },
  list: {
    gap: 10,
  },
  listItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c2d9ef',
  },
  muted: {
    opacity: 0.75,
  },
  mutedSmall: {
    opacity: 0.75,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
});
