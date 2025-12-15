import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrainingClass } from '@/constants/schema';
import { TopBar } from '@/components/top-bar';
import { instructorProfiles, seedAccounts } from '@/constants/seed-data';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';
import { instructorProfiles, seedAccounts } from '@/constants/seed-data';

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
  scheduleStartDate: string;
  scheduleEndDate: string;
  tags: string;
  instructorId: string;
};

const weekDayOptions = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseDateOnly = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const generateTimeSlots = (startHour = 6, endHour = 22, stepMinutes = 30) => {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      if (hour === endHour && minute > 0) continue;
      slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return slots;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const isOverlapping = (startA: string, endA: string, startB: string, endB: string) => {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
};

const defaultDateStart = formatDateInput(new Date());
const defaultDateEnd = formatDateInput(addDays(new Date(), 45));

const defaultClassForm: ClassFormState = {
  title: '',
  description: '',
  level: 'all',
  category: 'crossfit',
  capacity: '12',
  scheduleDay: 'Seg',
  scheduleStart: '07:00',
  scheduleEnd: '08:00',
  scheduleLocation: 'Área principal',
  scheduleStartDate: defaultDateStart,
  scheduleEndDate: defaultDateEnd,
  tags: 'metcon, iniciantes',
  instructorId: instructorProfiles[0]?.id ?? 'instructor-1',
};

const createDefaultClassForm = (): ClassFormState => ({
  ...defaultClassForm,
  scheduleStartDate: formatDateInput(new Date()),
  scheduleEndDate: formatDateInput(addDays(new Date(), 45)),
});

type DropdownFieldProps = {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
};

function DropdownField({ label, value, options, onSelect }: DropdownFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dropdownWrapper}>
      <ThemedText style={styles.dropdownLabel}>{label}</ThemedText>
      <Pressable style={styles.dropdown} onPress={() => setOpen((prev) => !prev)}>
        <ThemedText>{options.find((option) => option.value === value)?.label || 'Selecionar'}</ThemedText>
        <ThemedText style={styles.dropdownCaret}>{open ? '▴' : '▾'}</ThemedText>
      </Pressable>
      {open && (
        <ThemedView style={styles.dropdownList}>
          <ScrollView style={{ maxHeight: 180 }}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.dropdownOption, option.value === value && styles.dropdownOptionActive]}
                onPress={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}>
                <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </ThemedView>
      )}
    </View>
  );
}

const coachOptions = seedAccounts
  .filter((account) => account.role === 'INSTRUCTOR')
  .map((account) => {
    const instructorProfile = instructorProfiles.find((profile) => profile.userId === account.id);
    return {
      id: instructorProfile?.id ?? account.id,
      label: instructorProfile?.fullName ?? account.displayName ?? account.email,
    };
  });

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

type DateRangeCalendarProps = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
};

function DateRangeCalendar({ startDate, endDate, onChange }: DateRangeCalendarProps) {
  const initialVisibleMonth = parseDateOnly(startDate) ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialVisibleMonth.getFullYear(), initialVisibleMonth.getMonth(), 1),
  );

  const parsedStart = parseDateOnly(startDate);
  const parsedEnd = parseDateOnly(endDate);

  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const startOffset = (visibleMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const handleSelectDate = (day: number) => {
    const selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);

    if (!parsedStart || (parsedStart && parsedEnd)) {
      onChange(formatDateInput(selectedDate), '');
      return;
    }

    if (selectedDate < parsedStart) {
      onChange(formatDateInput(selectedDate), formatDateInput(parsedStart));
      return;
    }

    onChange(formatDateInput(parsedStart), formatDateInput(selectedDate));
  };

  const renderDayCell = (cellDate: Date | null, index: number) => {
    if (!cellDate) {
      return <View key={`empty-${index}`} style={[styles.dayCell, styles.dayCellEmpty]} />;
    }

    const isStart = parsedStart && isSameDay(cellDate, parsedStart);
    const isEnd = parsedEnd && isSameDay(cellDate, parsedEnd);
    const isInRange =
      parsedStart && parsedEnd && cellDate > parsedStart && cellDate < parsedEnd;

    const isSelected = isStart || isEnd;

    return (
      <Pressable
        key={dateKey(cellDate)}
        style={[
          styles.dayCell,
          (isSelected || isInRange) && styles.rangeCell,
          isSelected && styles.rangeEdge,
        ]}
        onPress={() => handleSelectDate(cellDate.getDate())}>
        <ThemedText
          type="defaultSemiBold"
          style={[(isSelected || isInRange) && styles.rangeCellText, isSelected && styles.rangeEdgeText]}>
          {cellDate.getDate()}
        </ThemedText>
      </Pressable>
    );
  };

  const calendarCells = useMemo(() => {
    return Array.from({ length: totalCells }).map((_, index) => {
      const dayNumber = index - startOffset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return null;
      }
      return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber);
    });
  }, [daysInMonth, startOffset, totalCells, visibleMonth]);

  const monthNames = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  return (
    <View style={styles.rangePicker}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} style={styles.monthButton}>
          <ThemedText type="defaultSemiBold">‹</ThemedText>
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.monthTitle}>
          {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </ThemedText>
        <Pressable onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} style={styles.monthButton}>
          <ThemedText type="defaultSemiBold">›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekDayOptions.map((day) => (
          <ThemedText key={`week-${day}`} style={[styles.weekDay, styles.muted]}>
            {day}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>{calendarCells.map(renderDayCell)}</View>
    </View>
  );
}

export default function InstructorClassesScreen() {
  const { classes, createClass, updateClass, deleteClass } = useInstructorData();
  const insets = useSafeAreaInsets();

  const [classForm, setClassForm] = useState<ClassFormState>(() => createDefaultClassForm());
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classErrors, setClassErrors] = useState<Partial<Record<keyof ClassFormState, string>>>({});
  const timeOptions = useMemo(() => generateTimeSlots(), []);
  const occupiedIntervals = useMemo(
    () =>
      classes
        .filter((item) => item.schedule[0] && item.id !== editingClassId)
        .flatMap((item) =>
          item.schedule
            .filter((slot) => slot.day === classForm.scheduleDay)
            .map((slot) => ({ start: slot.start, end: slot.end })),
        ),
    [classes, classForm.scheduleDay, editingClassId],
  );
  const availableStartTimes = useMemo(
    () =>
      timeOptions.filter((time) =>
        occupiedIntervals.every(
          (interval) =>
            timeToMinutes(time) < timeToMinutes(interval.start) ||
            timeToMinutes(time) >= timeToMinutes(interval.end),
        ),
      ),
    [occupiedIntervals, timeOptions],
  );
  const availableEndTimes = useMemo(() => {
    if (!classForm.scheduleStart) return [];
    const startMinutes = timeToMinutes(classForm.scheduleStart);

    return timeOptions.filter((time) => {
      const candidateMinutes = timeToMinutes(time);
      if (candidateMinutes <= startMinutes) return false;
      return occupiedIntervals.every(
        (interval) => !isOverlapping(classForm.scheduleStart, time, interval.start, interval.end),
      );
    });
  }, [classForm.scheduleStart, occupiedIntervals, timeOptions]);

  useEffect(() => {
    if (availableStartTimes.length === 0) return;
    if (!availableStartTimes.includes(classForm.scheduleStart)) {
      setClassForm((prev) => ({ ...prev, scheduleStart: availableStartTimes[0], scheduleEnd: '' }));
    }
  }, [availableStartTimes, classForm.scheduleStart]);

  useEffect(() => {
    if (availableEndTimes.length === 0) return;
    if (!availableEndTimes.includes(classForm.scheduleEnd)) {
      setClassForm((prev) => ({ ...prev, scheduleEnd: availableEndTimes[0] }));
    }
  }, [availableEndTimes, classForm.scheduleEnd]);

  const coachNameForId = useCallback(
    (id?: string) => coachOptions.find((coach) => coach.id === id)?.label ?? 'Coach',
    [],
  );

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', onPress: onConfirm },
    ]);
  };

  const validateClassForm = () => {
    const errors: Partial<Record<keyof ClassFormState, string>> = {};

    if (!classForm.title.trim()) {
      errors.title = 'Informe um título para a aula.';
    }

    if (!classForm.capacity.trim()) {
      errors.capacity = 'Capacidade é obrigatória.';
    } else if (Number.isNaN(Number(classForm.capacity)) || Number(classForm.capacity) <= 0) {
      errors.capacity = 'Use um número maior que zero.';
    }

    if (!classForm.scheduleDay.trim()) {
      errors.scheduleDay = 'Defina o dia do cronograma.';
    }

    if (!classForm.scheduleStart.trim() || !classForm.scheduleEnd.trim()) {
      errors.scheduleStart = 'Horários de início e fim são obrigatórios.';
    } else if (timeToMinutes(classForm.scheduleEnd) <= timeToMinutes(classForm.scheduleStart)) {
      errors.scheduleEnd = 'O fim deve ser depois do início.';
    } else if (
      occupiedIntervals.some((interval) =>
        isOverlapping(classForm.scheduleStart, classForm.scheduleEnd, interval.start, interval.end),
      )
    ) {
      errors.scheduleStart = 'Escolha um horário que não conflite com outra aula.';
    }

    if (!classForm.scheduleLocation.trim()) {
      errors.scheduleLocation = 'Defina um local para a aula.';
    }

    if (!classForm.scheduleStartDate.trim() || !classForm.scheduleEndDate.trim()) {
      errors.scheduleStartDate = 'Informe o período em que a aula ficará ativa.';
    } else if (new Date(classForm.scheduleEndDate) < new Date(classForm.scheduleStartDate)) {
      errors.scheduleEndDate = 'A data final deve ser após a data inicial.';
    }

    setClassErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitClass = () => {
    const isValid = validateClassForm();
    if (!isValid) {
      Alert.alert('Revise os campos', 'Corrija os destaques antes de salvar a aula.');
      return;
    }

    const payload: Omit<TrainingClass, 'id' | 'createdAt' | 'updatedAt'> = {
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
          startDate: classForm.scheduleStartDate,
          endDate: classForm.scheduleEndDate,
        },
      ],
      tags: classForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      instructorId: classForm.instructorId,
    };

    const isEditing = Boolean(editingClassId);
    const promptTitle = isEditing ? 'Atualizar aula' : 'Criar aula';
    const promptMessage = isEditing
      ? 'Deseja salvar as alterações desta aula?'
      : 'Deseja criar esta nova aula?';

    confirmAction(promptTitle, promptMessage, () => {
      if (editingClassId) {
        updateClass(editingClassId, payload);
        Alert.alert('Aula atualizada', 'As mudanças foram salvas.');
      } else {
        createClass(payload);
        Alert.alert('Nova aula criada', 'A aula foi cadastrada com sucesso.');
      }

      setClassForm(createDefaultClassForm());
      setClassErrors({});
      setEditingClassId(null);
    });
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
      scheduleDay: target.schedule[0]?.day ?? 'Seg',
      scheduleStart: target.schedule[0]?.start ?? '07:00',
      scheduleEnd: target.schedule[0]?.end ?? '08:00',
      scheduleLocation: target.schedule[0]?.location ?? 'Box',
      scheduleStartDate: target.schedule[0]?.startDate ?? defaultDateStart,
      scheduleEndDate: target.schedule[0]?.endDate ?? defaultDateEnd,
      tags: target.tags.join(', '),
      instructorId: target.instructorId ?? instructorProfiles[0]?.id ?? 'instructor-1',
    });
    setClassErrors({});
    setEditingClassId(id);
  };

  const handleRemoveClass = (id: string) => {
    Alert.alert('Cancelar aula', 'Confirmar cancelamento também remove sessões relacionadas. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cancelar aula',
        style: 'destructive',
        onPress: () => {
          deleteClass(id);
          Alert.alert('Aula cancelada', 'A aula e suas sessões foram removidas.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['left', 'right', 'bottom']}>
      <TopBar title="Aulas" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Aulas recorrentes
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Cadastrar ou editar aula</ThemedText>
          <ThemedText style={styles.muted}>
            Use os horários disponíveis para evitar conflitos com outras turmas e defina um período de vigência.
          </ThemedText>
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
          {(classErrors.title || classErrors.capacity) && (
            <ThemedText style={styles.errorText}>{classErrors.title ?? classErrors.capacity}</ThemedText>
          )}
          <TextInput
            style={styles.input}
            placeholder="Descrição"
            value={classForm.description}
            onChangeText={(text) => setClassForm((prev) => ({ ...prev, description: text }))}
          />
          <DropdownField
            label="Coach responsável"
            value={classForm.instructorId}
            options={coachOptions.map((coach) => ({ label: coach.label, value: coach.id }))}
            onSelect={(coachId) => setClassForm((prev) => ({ ...prev, instructorId: coachId }))}
          />
          <View style={styles.formRow}>
            <DropdownField
              label="Dia da semana"
              value={classForm.scheduleDay}
              options={weekDayOptions.map((day) => ({ label: day, value: day }))}
              onSelect={(day) => setClassForm((prev) => ({ ...prev, scheduleDay: day }))}
            />
            <DropdownField
              label="Horário de início"
              value={classForm.scheduleStart}
              options={availableStartTimes.map((time) => ({ label: time, value: time }))}
              onSelect={(start) => setClassForm((prev) => ({ ...prev, scheduleStart: start }))}
            />
            <DropdownField
              label="Horário de término"
              value={classForm.scheduleEnd}
              options={availableEndTimes.map((time) => ({ label: time, value: time }))}
              onSelect={(end) => setClassForm((prev) => ({ ...prev, scheduleEnd: end }))}
            />
          </View>
          {(classErrors.scheduleDay || classErrors.scheduleStart || classErrors.scheduleEnd) && (
            <ThemedText style={styles.errorText}>
              {classErrors.scheduleDay ?? classErrors.scheduleStart ?? classErrors.scheduleEnd}
            </ThemedText>
          )}
          <View style={styles.rangeRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Período de vigência</ThemedText>
              <ThemedText style={styles.muted}>
                Selecione datas de início e fim para que a aula apareça no calendário.
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.rangeSummary}>
                {classForm.scheduleStartDate && classForm.scheduleEndDate
                  ? `${classForm.scheduleStartDate} até ${classForm.scheduleEndDate}`
                  : 'Escolha um intervalo'}
              </ThemedText>
            </View>
          </View>
          <DateRangeCalendar
            startDate={classForm.scheduleStartDate}
            endDate={classForm.scheduleEndDate}
            onChange={(start, end) =>
              setClassForm((prev) => ({
                ...prev,
                scheduleStartDate: start,
                scheduleEndDate: end,
              }))
            }
          />
          {(classErrors.scheduleStartDate || classErrors.scheduleEndDate) && (
            <ThemedText style={styles.errorText}>
              {classErrors.scheduleStartDate ?? classErrors.scheduleEndDate}
            </ThemedText>
          )}
          <TextInput
            style={styles.input}
            placeholder="Local"
            value={classForm.scheduleLocation}
            onChangeText={(text) => setClassForm((prev) => ({ ...prev, scheduleLocation: text }))}
          />
          {classErrors.scheduleLocation && (
            <ThemedText style={styles.errorText}>{classErrors.scheduleLocation}</ThemedText>
          )}
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
                    Coach: {coachNameForId(trainingClass.instructorId)}
                  </ThemedText>
                  <ThemedText style={styles.muted}>
                    {trainingClass.schedule
                      .map(
                        (slot) =>
                          `${slot.day} ${slot.start}-${slot.end} · ${slot.startDate ?? 'início imediato'} a ${slot.endDate ?? 'sem data final'}`,
                      )
                      .join(' · ')}
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
            {classes.length === 0 && (
              <ThemedText style={styles.muted}>Nenhuma aula cadastrada. Crie sua primeira turma acima.</ThemedText>
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
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dropdownWrapper: {
    flex: 1,
    minWidth: 140,
    gap: 6,
  },
  dropdownLabel: {
    opacity: 0.7,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownCaret: {
    opacity: 0.6,
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownOptionActive: {
    backgroundColor: '#dff1ff',
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
  errorText: {
    color: '#b42318',
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
    alignItems: 'flex-start',
    flexWrap: 'wrap',
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
    alignItems: 'flex-start',
  },
  linkButton: {
    backgroundColor: '#0e9aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rangePicker: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  rangeSummary: {
    marginTop: 6,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
    gap: 6,
  },
  dayCellEmpty: {
    opacity: 0.4,
  },
  rangeCell: {
    backgroundColor: '#dff1ff',
  },
  rangeCellText: {
    color: '#0b3b5a',
  },
  rangeEdge: {
    backgroundColor: '#0e9aed',
  },
  rangeEdgeText: {
    color: '#fff',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#d9eefe',
  },
  monthTitle: {
    textTransform: 'capitalize',
  },
});
