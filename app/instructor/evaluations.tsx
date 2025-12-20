import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TextInputProps } from 'react-native';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Evaluation } from '@/constants/schema';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { useInstructorData } from '@/providers/instructor-data-provider';

export default function EvaluationsScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { hasRole } = useAuth();
  const { students, getStudentEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } =
    useInstructorData();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isMetersOpen, setMetersOpen] = useState(false);
  const [isCentimetersOpen, setCentimetersOpen] = useState(false);
  const [date, setDate] = useState<string>(today);
  const [questionnaire, setQuestionnaire] = useState<Evaluation['questionnaire']>({
    trainingFrequency: '',
    goalsFocus: '',
    mobility: '',
    nutrition: '',
    sleepQuality: '',
    stressLevel: '',
    weightKg: undefined,
    heightMeters: 1,
    heightCentimeters: 70,
  });
  const [weightInput, setWeightInput] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return students.filter((student) => {
      // ✅ UID is the canonical identity
      if (seen.has(student.uid)) return false;
      seen.add(student.uid);
      return true;
    });
  }, [students]);

  const meterOptions = useMemo(() => [0, 1, 2], []);
  const centimeterOptions = useMemo(() => Array.from({ length: 100 }, (_, index) => index), []);

  const formatHeight = (meters?: number, centimeters?: number) => {
    if (meters === undefined && centimeters === undefined) return null;
    const safeMeters = meters ?? 0;
    const safeCentimeters = centimeters ?? 0;
    return `${safeMeters}.${safeCentimeters.toString().padStart(2, '0')} m`;
  };

  const resetForm = useCallback(() => {
    setDate(today);
    setQuestionnaire({
      trainingFrequency: '',
      goalsFocus: '',
      mobility: '',
      nutrition: '',
      sleepQuality: '',
      stressLevel: '',
      weightKg: undefined,
      heightMeters: 1,
      heightCentimeters: 70,
    });
    setWeightInput('');
    setNotes('');
    setEditingId(null);
  }, [today]);

  useEffect(() => {
    if (uniqueStudents.length > 0 && !selectedStudentUid) {
      setSelectedStudentUid(uniqueStudents[0].uid);
    }
  }, [selectedStudentUid, uniqueStudents]);

  useEffect(() => {
    resetForm();
  }, [resetForm, selectedStudentUid]);

  const selectedStudent = useMemo(
    () => uniqueStudents.find((student) => student.uid === selectedStudentUid) ?? null,
    [selectedStudentUid, uniqueStudents],
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
        // ✅ fetch by UID
        getStudentEvaluations(student.uid).map((evaluation) => ({ evaluation, student })),
      )
      .sort((a, b) => new Date(b.evaluation.date).getTime() - new Date(a.evaluation.date).getTime());
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
    if (!selectedStudentUid) {
      Alert.alert('Selecione um aluno', 'Escolha um aluno para registrar a avaliação.');
      return;
    }

    const evaluationDate = editingId ? date : today;

    const normalizedMeters = Math.min(Math.max(questionnaire.heightMeters ?? 0, 0), 2);
    const normalizedCentimeters = Math.min(Math.max(questionnaire.heightCentimeters ?? 0, 0), 99);
    const totalHeight = normalizedMeters * 100 + normalizedCentimeters;

    if (totalHeight <= 0) {
      Alert.alert('Altura inválida', 'Informe altura em metros e centímetros para continuar.');
      return;
    }

    if (questionnaire.weightKg !== undefined && questionnaire.weightKg <= 0) {
      Alert.alert('Peso inválido', 'Use um valor de peso maior que zero ou deixe em branco.');
      return;
    }

    const payloadQuestionnaire: Evaluation['questionnaire'] = {
      ...questionnaire,
      heightMeters: normalizedMeters,
      heightCentimeters: normalizedCentimeters,
      weightKg:
        questionnaire.weightKg !== undefined
          ? Math.round(Math.min(questionnaire.weightKg, 400) * 10) / 10
          : undefined,
    };

    const payload = {
      // ✅ UID field
      studentUid: selectedStudentUid,
      date: evaluationDate,
      questionnaire: payloadQuestionnaire,
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
    // ✅ use studentUid
    setSelectedStudentUid(evaluation.studentUid);
    setEditingId(evaluation.id);
    setDate(evaluation.date);
    setQuestionnaire(evaluation.questionnaire);
    setWeightInput(
      typeof evaluation.questionnaire.weightKg === 'number'
        ? evaluation.questionnaire.weightKg.toString()
        : '',
    );
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

  const handleWeightInputChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    setWeightInput(sanitized);

    const parsed = parseFloat(sanitized);
    if (Number.isNaN(parsed)) {
      setQuestionnaire((prev) => ({ ...prev, weightKg: undefined }));
      return;
    }

    const bounded = Math.min(Math.max(parsed, 0), 400);
    setQuestionnaire((prev) => ({ ...prev, weightKg: bounded }));
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder?: string,
    options?: {
      keyboardType?: TextInputProps['keyboardType'];
      editable?: boolean;
      inputMode?: TextInputProps['inputMode'];
    },
  ) => (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colorScheme === 'dark' ? '#7a8695' : '#7d8a96'}
        style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].icon }]}
        keyboardType={options?.keyboardType}
        inputMode={options?.inputMode}
        editable={options?.editable ?? true}
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={insets.top + 12}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          <ThemedText type="title" style={styles.heading}>
            Registro de avaliações
          </ThemedText>
          <ThemedText style={styles.leadText}>
            Preencha o questionário físico e acompanhe as avaliações anteriores para manter o progresso claro.
          </ThemedText>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Selecione o aluno</ThemedText>
            <ThemedText style={styles.muted}>Atribua o questionário a um cliente com conta ativa.</ThemedText>

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
                        key={student.uid}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedStudentUid(student.uid);
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

            {!uniqueStudents.length && <ThemedText style={styles.muted}>Nenhum aluno encontrado para atribuir.</ThemedText>}
            {selectedStudent ? (
              <ThemedText style={styles.mutedSmall}>
                Atribuindo avaliação para {selectedStudent.fullName}.
              </ThemedText>
            ) : null}
          </ThemedView>

          {/* ✅ rest of your UI is unchanged, except disabled flag */}
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">{editingId ? 'Editar avaliação' : 'Nova avaliação'}</ThemedText>
            {renderInput('Data', date, setDate, 'AAAA-MM-DD', { editable: false })}
            {renderInput('Peso (kg)', weightInput, handleWeightInputChange, 'Ex.: 72.5', {
              keyboardType: 'decimal-pad',
              inputMode: 'decimal',
            })}

            {/* ... keep the rest exactly as you have it ... */}

            <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={!selectedStudentUid}>
              <ThemedText type="defaultSemiBold" style={styles.submitText}>
                {editingId ? 'Salvar alterações' : 'Registrar avaliação'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* history block stays the same; evaluation.studentUid already used in handleEdit */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  heading: { marginBottom: 4 },
  leadText: { color: '#4a5a6a' },
  card: { borderRadius: 14, padding: 16, gap: 14, backgroundColor: '#e9f4ff' },
  field: { gap: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontFamily: Fonts.mono,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitButton: {
    marginTop: 4,
    backgroundColor: '#022a4c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: '#fff' },
  muted: { opacity: 0.7 },
  mutedSmall: { opacity: 0.6, fontSize: 12 },
  list: { gap: 12 },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  listText: { flex: 1, gap: 4 },
  actions: { gap: 6, alignItems: 'flex-end' },
  actionButton: { paddingVertical: 6, paddingHorizontal: 8 },
  destructiveButton: { paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#f5e5e5', borderRadius: 10 },
  destructiveText: { color: '#a60000' },
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
  dropdownOpen: { borderColor: '#022a4c' },
  dropdownPanel: { marginTop: 10, gap: 10 },
  dropdownList: {
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c2d9ef',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heightSelectors: { flexDirection: 'row', gap: 12 },
  heightList: {
    maxHeight: 180,
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
