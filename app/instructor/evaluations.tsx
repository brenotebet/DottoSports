import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const { hasRole } = useAuth();
  const { students, getStudentEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } =
    useInstructorData();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [isDropdownOpen, setDropdownOpen] = useState(false);
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

  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return students.filter((student) => {
      if (seen.has(student.id)) return false;
      seen.add(student.id);
      return true;
    });
  }, [students]);

  const resetForm = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (uniqueStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(uniqueStudents[0].id);
    }
  }, [selectedStudentId, uniqueStudents]);

  useEffect(() => {
    resetForm();
  }, [resetForm, selectedStudentId]);

  const selectedStudent = useMemo(
    () => uniqueStudents.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, uniqueStudents],
  );

  const filteredStudents = useMemo(
    () =>
      uniqueStudents.filter((student) =>
        student.fullName.toLowerCase().includes(searchTerm.trim().toLowerCase()),
      ),
    [searchTerm, uniqueStudents],
  );

  const allEvaluations = useMemo(() => {
    return uniqueStudents
      .flatMap((student) =>
        getStudentEvaluations(student.id).map((evaluation) => ({ evaluation, student })),
      )
      .sort(
        (a, b) => new Date(b.evaluation.date).getTime() - new Date(a.evaluation.date).getTime(),
      );
  }, [getStudentEvaluations, uniqueStudents]);

  const filteredEvaluations = useMemo(() => {
    const term = historySearchTerm.trim().toLowerCase();
    if (!term) return allEvaluations;

    return allEvaluations.filter(({ student, evaluation }) => {
      const haystack = [
        student.fullName,
        student.phone,
        evaluation.questionnaire.goalsFocus,
        evaluation.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [allEvaluations, historySearchTerm]);

  const handleSubmit = () => {
    if (!selectedStudentId) {
      Alert.alert('Selecione um aluno', 'Escolha um aluno para registrar a avaliação.');
      return;
    }

    const payload = {
      studentId: selectedStudentId,
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
    setSelectedStudentId(evaluation.studentId);
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

  if (!hasRole(['INSTRUCTOR', 'ADMIN'])) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { paddingTop: insets.top }]}
        edges={['top', 'left', 'right', 'bottom']}>
        <TopBar title="Avaliações" />
        <View style={[styles.container, { flex: 1, justifyContent: 'center' }]}>
          <ThemedText type="title" style={styles.heading}>
            Acesso restrito
          </ThemedText>
          <ThemedText style={styles.leadText}>
            Entre com uma conta de instrutor ou administrador para registrar e gerenciar avaliações.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

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
          <ThemedText type="subtitle">Selecione o aluno</ThemedText>
          <ThemedText style={styles.muted}>
            Atribua o questionário a um cliente com conta ativa.
          </ThemedText>
          <Pressable
            style={[styles.dropdown, isDropdownOpen && styles.dropdownOpen]}
            onPress={() => setDropdownOpen((prev) => !prev)}>
            <View>
              <ThemedText type="defaultSemiBold">
                {selectedStudent ? selectedStudent.fullName : 'Escolha um aluno'}
              </ThemedText>
              <ThemedText style={styles.mutedSmall}>
                {selectedStudent ? selectedStudent.phone : 'Clientes com conta ativa'}
              </ThemedText>
            </View>
            <ThemedText type="defaultSemiBold">{isDropdownOpen ? '▲' : '▼'}</ThemedText>
          </Pressable>

          {isDropdownOpen && (
            <View style={styles.dropdownPanel}>
              <TextInput
                placeholder="Buscar cliente"
                placeholderTextColor={colorScheme === 'dark' ? '#7a8695' : '#7d8a96'}
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].icon }]}
              />
              <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
                {filteredStudents.length === 0 ? (
                  <ThemedText style={styles.muted}>Nenhum cliente encontrado.</ThemedText>
                ) : (
                  filteredStudents.map((student) => (
                    <Pressable
                      key={student.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedStudentId(student.id);
                        setDropdownOpen(false);
                        setSearchTerm('');
                      }}>
                      <ThemedText type="defaultSemiBold">{student.fullName}</ThemedText>
                      <ThemedText style={styles.mutedSmall}>{student.phone}</ThemedText>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {!uniqueStudents.length && (
            <ThemedText style={styles.muted}>Nenhum aluno encontrado para atribuir.</ThemedText>
          )}
          {selectedStudent ? (
            <ThemedText style={styles.mutedSmall}>
              Atribuindo avaliação para {selectedStudent.fullName}.
            </ThemedText>
          ) : null}
        </ThemedView>

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

          <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={!selectedStudentId}>
            <ThemedText type="defaultSemiBold" style={styles.submitText}>
              {editingId ? 'Salvar alterações' : 'Registrar avaliação'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.card}>
          <View style={{ gap: 8 }}>
            <ThemedText type="subtitle">Histórico</ThemedText>
            <TextInput
              placeholder="Buscar por cliente, foco ou observação"
              placeholderTextColor={colorScheme === 'dark' ? '#7a8695' : '#7d8a96'}
              value={historySearchTerm}
              onChangeText={setHistorySearchTerm}
              style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].icon }]}
            />
          </View>
          {filteredEvaluations.length === 0 ? (
            <ThemedText style={styles.muted}>Nenhuma avaliação registrada até agora.</ThemedText>
          ) : (
            <View style={styles.list}>
              {filteredEvaluations.map(({ evaluation, student }) => (
                <View key={evaluation.id} style={styles.listItem}>
                  <View style={styles.listText}>
                    <ThemedText style={styles.mutedSmall}>{student.fullName}</ThemedText>
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
  dropdown: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c2d9ef',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownOpen: {
    borderColor: '#022a4c',
  },
  dropdownPanel: {
    marginTop: 10,
    gap: 10,
  },
  dropdownList: {
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c2d9ef',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dropdownItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    gap: 4,
  },
});
