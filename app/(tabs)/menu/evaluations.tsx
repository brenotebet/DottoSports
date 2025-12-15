import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { Evaluation } from '@/constants/schema';
import { useInstructorData } from '@/providers/instructor-data-provider';

export default function EvaluationsScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    ensureStudentProfile,
    getStudentEvaluations,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
  } = useInstructorData();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [questionnaire, setQuestionnaire] = useState<Evaluation['questionnaire']>({
    trainingFrequency: '',
    goalsFocus: '',
    mobility: '',
    nutrition: '',
    sleepQuality: '',
    stressLevel: '',
  });
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const profile = ensureStudentProfile(user.email, user.displayName);
      setStudentId(profile.id);
    }
  }, [ensureStudentProfile, user]);

  const evaluations = useMemo(
    () => (studentId ? getStudentEvaluations(studentId) : []),
    [getStudentEvaluations, studentId],
  );

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setQuestionnaire({
      trainingFrequency: '',
      goalsFocus: '',
      mobility: '',
      nutrition: '',
      sleepQuality: '',
      stressLevel: '',
    });
    setNotes('');
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!studentId) {
      Alert.alert('Perfil não encontrado', 'Conclua login para registrar a avaliação.');
      return;
    }

    const payload = {
      studentId,
      date,
      questionnaire,
      notes,
    } satisfies Omit<Evaluation, 'id'>;

    if (editingId) {
      updateEvaluation(editingId, payload);
      Alert.alert('Avaliação atualizada', 'As respostas foram salvas com sucesso.');
    } else {
      createEvaluation(payload);
      Alert.alert('Avaliação registrada', 'Avaliação adicionada ao histórico.');
    }

    resetForm();
  };

  const handleEdit = (evaluation: Evaluation) => {
    setEditingId(evaluation.id);
    setDate(evaluation.date);
    setQuestionnaire(evaluation.questionnaire);
    setNotes(evaluation.notes ?? '');
  };

  const handleDelete = (evaluation: Evaluation) => {
    Alert.alert('Excluir avaliação', 'Deseja remover esta avaliação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => deleteEvaluation(evaluation.id),
      },
    ]);
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder?: string,
  ) => (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colorScheme === 'dark' ? '#7a8695' : '#7d8a96'}
        style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].icon }]}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top }]}
      edges={['top', 'left', 'right', 'bottom']}>
      <TopBar title="Avaliações" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>Registro de avaliações</ThemedText>
        <ThemedText style={styles.leadText}>
          Preencha o questionário físico e acompanhe as avaliações anteriores para manter o progresso claro.
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">
            {editingId ? 'Editar avaliação' : 'Nova avaliação'}
          </ThemedText>
          {renderInput('Data', date, setDate, 'AAAA-MM-DD')}
          {renderInput('Frequência de treino', questionnaire.trainingFrequency, (text) =>
            setQuestionnaire((prev) => ({ ...prev, trainingFrequency: text })),
            'Ex.: 4x por semana',
          )}
          {renderInput('Foco atual', questionnaire.goalsFocus, (text) =>
            setQuestionnaire((prev) => ({ ...prev, goalsFocus: text })),
            'Ex.: Ganho de força e condicionamento',
          )}
          {renderInput('Mobilidade', questionnaire.mobility, (text) =>
            setQuestionnaire((prev) => ({ ...prev, mobility: text })),
            'Ex.: tornozelos e ombros',
          )}
          {renderInput('Nutrição', questionnaire.nutrition, (text) =>
            setQuestionnaire((prev) => ({ ...prev, nutrition: text })),
            'Ex.: 80/20 com proteína suficiente',
          )}
          {renderInput('Sono', questionnaire.sleepQuality, (text) =>
            setQuestionnaire((prev) => ({ ...prev, sleepQuality: text })),
            'Ex.: 7h por noite',
          )}
          {renderInput('Nível de estresse', questionnaire.stressLevel ?? '', (text) =>
            setQuestionnaire((prev) => ({ ...prev, stressLevel: text })),
            'Ex.: moderado',
          )}

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Observações</ThemedText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anotações complementares"
              placeholderTextColor={colorScheme === 'dark' ? '#7a8695' : '#7d8a96'}
              multiline
              style={[styles.input, styles.textArea, { borderColor: Colors[colorScheme ?? 'light'].icon }]}
            />
          </View>

          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <ThemedText type="defaultSemiBold" style={styles.submitText}>
              {editingId ? 'Salvar alterações' : 'Registrar avaliação'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Histórico</ThemedText>
          {evaluations.length === 0 ? (
            <ThemedText style={styles.muted}>Nenhuma avaliação registrada até agora.</ThemedText>
          ) : (
            <View style={styles.list}>
              {evaluations.map((evaluation) => (
                <View key={evaluation.id} style={styles.listItem}>
                  <View style={styles.listText}>
                    <ThemedText type="defaultSemiBold">{evaluation.date}</ThemedText>
                    <ThemedText style={styles.muted}>
                      {evaluation.questionnaire.goalsFocus || 'Sem foco informado'}
                    </ThemedText>
                    {evaluation.notes ? (
                      <ThemedText style={styles.mutedSmall}>{evaluation.notes}</ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.actions}>
                    <Pressable onPress={() => handleEdit(evaluation)} style={styles.actionButton}>
                      <ThemedText type="defaultSemiBold">Editar</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(evaluation)} style={styles.destructiveButton}>
                      <ThemedText type="defaultSemiBold" style={styles.destructiveText}>
                        Excluir
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
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
  leadText: {
    color: '#4a5a6a',
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
    backgroundColor: '#e9f4ff',
  },
  field: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontFamily: Fonts.regular,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 4,
    backgroundColor: '#022a4c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
  },
  muted: {
    opacity: 0.7,
  },
  mutedSmall: {
    opacity: 0.6,
    fontSize: 12,
  },
  list: {
    gap: 12,
  },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  listText: {
    flex: 1,
    gap: 4,
  },
  actions: {
    gap: 6,
    alignItems: 'flex-end',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  destructiveButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f5e5e5',
    borderRadius: 10,
  },
  destructiveText: {
    color: '#a60000',
  },
});
