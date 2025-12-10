import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';
import { TrainingClass } from '@/constants/schema';

type ClassFormState = {
  title: string;
  description: string;
  level: 'all' | 'beginner' | 'intermediate' | 'advanced';
  category: 'crossfit' | 'weightlifting' | 'mobility' | 'conditioning';
  capacity: string;
  scheduleDay: string;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleLocation: string;
  tags: string;
};

type SessionFormState = {
  classId: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: string;
  tags: string;
  coachNotes?: string;
};

const defaultClassForm: ClassFormState = {
  title: '',
  description: '',
  level: 'all',
  category: 'crossfit',
  capacity: '12',
  scheduleDay: 'Mon',
  scheduleStart: '07:00',
  scheduleEnd: '08:00',
  scheduleLocation: 'Área principal',
  tags: 'metcon, iniciantes',
};

const defaultSessionForm: SessionFormState = {
  classId: '',
  startTime: '2024-12-15T18:00:00Z',
  endTime: '2024-12-15T19:00:00Z',
  location: 'Área principal',
  capacity: '12',
  tags: 'monitorar check-in',
  coachNotes: 'Sincronizar progressões e escalações.',
};

export default function InstructorClassesScreen() {
  const insets = useSafeAreaInsets();
  const {
    classes,
    sessions,
    createClass,
    updateClass,
    deleteClass,
    createSession,
    updateSession,
    deleteSession,
  } = useInstructorData();

  const [classForm, setClassForm] = useState<ClassFormState>(defaultClassForm);
  const [sessionForm, setSessionForm] = useState<SessionFormState>({
    ...defaultSessionForm,
    classId: classes[0]?.id ?? '',
  });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionForm.classId && classes[0]) {
      setSessionForm((prev) => ({ ...prev, classId: classes[0].id }));
    }
  }, [classes, sessionForm.classId]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [sessions],
  );

  const handleSubmitClass = () => {
    if (!classForm.title || !classForm.capacity) {
      Alert.alert('Preencha título e capacidade para salvar a aula.');
      return;
    }

    const payload: Partial<TrainingClass> = {
      title: classForm.title,
      description: classForm.description || 'Aula personalizada para o box.',
      level: classForm.level,
      category: classForm.category,
      capacity: Number(classForm.capacity),
      schedule: [
        {
          day: classForm.scheduleDay,
          start: classForm.scheduleStart,
          end: classForm.scheduleEnd,
          location: classForm.scheduleLocation,
        },
      ],
      tags: classForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      instructorId: 'instructor-1',
    };

    if (editingClassId) {
      updateClass(editingClassId, payload);
      Alert.alert('Aula atualizada');
    } else {
      createClass(payload);
      Alert.alert('Nova aula criada');
    }

    setClassForm(defaultClassForm);
    setEditingClassId(null);
  };

  const handleEditClass = (id: string) => {
    const target = classes.find((item) => item.id === id);
    if (!target) return;

    setClassForm({
      title: target.title,
      description: target.description,
      level: target.level,
      category: target.category,
      capacity: String(target.capacity),
      scheduleDay: target.schedule[0]?.day ?? 'Mon',
      scheduleStart: target.schedule[0]?.start ?? '07:00',
      scheduleEnd: target.schedule[0]?.end ?? '08:00',
      scheduleLocation: target.schedule[0]?.location ?? 'Box',
      tags: target.tags.join(', '),
    });
    setEditingClassId(id);
  };

  const handleRemoveClass = (id: string) => {
    Alert.alert('Excluir aula', 'Tem certeza que deseja excluir esta aula e sessões relacionadas?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteClass(id) },
    ]);
  };

  const handleSubmitSession = () => {
    if (!sessionForm.classId) {
      Alert.alert('Associe a sessão a uma aula.');
      return;
    }

    const payload = {
      classId: sessionForm.classId,
      startTime: sessionForm.startTime,
      endTime: sessionForm.endTime,
      location: sessionForm.location,
      capacity: Number(sessionForm.capacity),
      tags: sessionForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      coachNotes: sessionForm.coachNotes,
    } as const;

    if (editingSessionId) {
      updateSession(editingSessionId, payload);
      Alert.alert('Sessão atualizada');
    } else {
      createSession(payload);
      Alert.alert('Sessão criada');
    }

    setSessionForm({ ...defaultSessionForm, classId: classes[0]?.id ?? '' });
    setEditingSessionId(null);
  };

  const handleEditSession = (id: string) => {
    const target = sessions.find((item) => item.id === id);
    if (!target) return;

    setSessionForm({
      classId: target.classId,
      startTime: target.startTime,
      endTime: target.endTime,
      location: target.location,
      capacity: String(target.capacity),
      tags: target.tags?.join(', ') ?? '',
      coachNotes: target.coachNotes,
    });
    setEditingSessionId(id);
  };

  const handleRemoveSession = (id: string) => {
    Alert.alert('Excluir sessão', 'Deseja remover esta sessão da agenda?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Aulas e sessões
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Cadastrar ou editar aula</ThemedText>
          <View style={styles.formRow}>
            <TextInput
              style={styles.input}
              placeholder="Título da aula"
              value={classForm.title}
              onChangeText={(text) => setClassForm((prev) => ({ ...prev, title: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Capacidade"
              keyboardType="numeric"
              value={classForm.capacity}
              onChangeText={(text) => setClassForm((prev) => ({ ...prev, capacity: text }))}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Descrição"
            value={classForm.description}
            onChangeText={(text) => setClassForm((prev) => ({ ...prev, description: text }))}
          />
          <View style={styles.formRow}>
            <TextInput
              style={styles.input}
              placeholder="Dia (ex: Mon)"
              value={classForm.scheduleDay}
              onChangeText={(text) => setClassForm((prev) => ({ ...prev, scheduleDay: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Início"
              value={classForm.scheduleStart}
              onChangeText={(text) => setClassForm((prev) => ({ ...prev, scheduleStart: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Fim"
              value={classForm.scheduleEnd}
              onChangeText={(text) => setClassForm((prev) => ({ ...prev, scheduleEnd: text }))}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Local"
            value={classForm.scheduleLocation}
            onChangeText={(text) => setClassForm((prev) => ({ ...prev, scheduleLocation: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Tags separadas por vírgula"
            value={classForm.tags}
            onChangeText={(text) => setClassForm((prev) => ({ ...prev, tags: text }))}
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.primaryButton} onPress={handleSubmitClass}>
              <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                {editingClassId ? 'Atualizar aula' : 'Criar aula'}
              </ThemedText>
            </Pressable>
            {editingClassId && (
              <Pressable style={styles.secondaryButton} onPress={() => setEditingClassId(null)}>
                <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                  Cancelar edição
                </ThemedText>
              </Pressable>
            )}
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Aulas criadas</ThemedText>
          <View style={styles.list}>
            {classes.map((trainingClass) => (
              <ThemedView key={trainingClass.id} style={styles.listItem}>
                <View style={styles.listText}>
                  <ThemedText type="defaultSemiBold">{trainingClass.title}</ThemedText>
                  <ThemedText style={styles.muted}>
                    {trainingClass.category} · {trainingClass.level} · Capacidade {trainingClass.capacity}
                  </ThemedText>
                  <ThemedText style={styles.muted}>
                    {trainingClass.schedule.map((slot) => `${slot.day} ${slot.start}-${slot.end}`).join(' · ')}
                  </ThemedText>
                  <View style={styles.tagRow}>
                    {trainingClass.tags.map((tag) => (
                      <ThemedView key={`${trainingClass.id}-${tag}`} style={styles.badge}>
                        <ThemedText style={styles.badgeText}>{tag}</ThemedText>
                      </ThemedView>
                    ))}
                  </View>
                </View>
                <View style={styles.actionColumn}>
                  <Pressable style={styles.linkButton} onPress={() => handleEditClass(trainingClass.id)}>
                    <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                      Editar
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.destructiveButton}
                    onPress={() => handleRemoveClass(trainingClass.id)}>
                    <ThemedText type="defaultSemiBold" style={styles.destructiveButtonText}>
                      Excluir
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            ))}
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Agendar sessão</ThemedText>
          <View style={styles.formRow}>
            <TextInput
              style={styles.input}
              placeholder="ID da aula"
              value={sessionForm.classId}
              onChangeText={(text) => setSessionForm((prev) => ({ ...prev, classId: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Capacidade"
              keyboardType="numeric"
              value={sessionForm.capacity}
              onChangeText={(text) => setSessionForm((prev) => ({ ...prev, capacity: text }))}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Início (ISO)"
            value={sessionForm.startTime}
            onChangeText={(text) => setSessionForm((prev) => ({ ...prev, startTime: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Fim (ISO)"
            value={sessionForm.endTime}
            onChangeText={(text) => setSessionForm((prev) => ({ ...prev, endTime: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Local"
            value={sessionForm.location}
            onChangeText={(text) => setSessionForm((prev) => ({ ...prev, location: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Tags da sessão"
            value={sessionForm.tags}
            onChangeText={(text) => setSessionForm((prev) => ({ ...prev, tags: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Notas do coach"
            value={sessionForm.coachNotes}
            onChangeText={(text) => setSessionForm((prev) => ({ ...prev, coachNotes: text }))}
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.primaryButton} onPress={handleSubmitSession}>
              <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                {editingSessionId ? 'Atualizar sessão' : 'Criar sessão'}
              </ThemedText>
            </Pressable>
            {editingSessionId && (
              <Pressable style={styles.secondaryButton} onPress={() => setEditingSessionId(null)}>
                <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                  Cancelar edição
                </ThemedText>
              </Pressable>
            )}
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Próximas sessões</ThemedText>
          <View style={styles.list}>
            {sortedSessions.map((session) => {
              const sessionClass = classes.find((item) => item.id === session.classId);
              return (
                <ThemedView key={session.id} style={styles.listItem}>
                  <View style={styles.listText}>
                    <ThemedText type="defaultSemiBold">{sessionClass?.title ?? session.classId}</ThemedText>
                    <ThemedText style={styles.muted}>
                      {new Date(session.startTime).toLocaleString('pt-BR', {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {session.location}
                    </ThemedText>
                    <ThemedText style={styles.muted}>
                      Capacidade {session.capacity} · {session.tags?.join(', ')}
                    </ThemedText>
                    {session.coachNotes && <ThemedText style={styles.muted}>{session.coachNotes}</ThemedText>}
                  </View>
                  <View style={styles.actionColumn}>
                    <Pressable style={styles.linkButton} onPress={() => handleEditSession(session.id)}>
                      <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                        Editar
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={styles.destructiveButton}
                      onPress={() => handleRemoveSession(session.id)}>
                      <ThemedText type="defaultSemiBold" style={styles.destructiveButtonText}>
                        Remover
                      </ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              );
            })}
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
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: '#0e9aed',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#0b3b5a',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0e9aed',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#0e9aed',
  },
  destructiveButton: {
    backgroundColor: '#ffe5e5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb4b4',
  },
  destructiveButtonText: {
    color: '#a01717',
  },
  list: {
    gap: 12,
  },
  listItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f4faff',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  listText: {
    flex: 1,
    gap: 6,
  },
  muted: {
    opacity: 0.72,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  actionColumn: {
    gap: 8,
    alignItems: 'flex-end',
  },
  linkButton: {
    backgroundColor: '#0e9aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
