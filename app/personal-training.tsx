import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';

export default function PersonalTrainingRequestScreen() {
  const insets = useSafeAreaInsets();
  const { createTrainingRequest } = useInstructorData();

  const [timesPerWeek, setTimesPerWeek] = useState('2');
  const [preferredTimes, setPreferredTimes] = useState('');
  const [goal, setGoal] = useState('');
  const [gym, setGym] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numericTimes = Number(timesPerWeek);
    if (!Number.isInteger(numericTimes) || numericTimes <= 0) {
      Alert.alert('Dados incompletos', 'Informe um número válido de treinos por semana.');
      return;
    }

    if (!preferredTimes.trim() || !goal.trim() || !gym.trim()) {
      Alert.alert('Dados incompletos', 'Preencha horários, objetivo e academia/box para enviar o pedido.');
      return;
    }

    try {
      setSubmitting(true);
      await createTrainingRequest({
        timesPerWeek: numericTimes,
        preferredTimes: preferredTimes.trim(),
        goal: goal.trim(),
        gym: gym.trim(),
        notes: notes.trim() || undefined,
      });
      Alert.alert(
        'Pedido enviado',
        'Assim que o coach visualizar, ele enviará uma mensagem em português com valores e disponibilidade.',
      );
      setPreferredTimes('');
      setGoal('');
      setGym('');
      setNotes('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar o pedido agora.';
      Alert.alert('Erro ao enviar', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['top', 'left', 'right', 'bottom']}>
      <TopBar title="Personal training" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.cardPrimary}>
          <ThemedText type="subtitle" style={styles.cardPrimaryText}>
            Atendimento 1:1
          </ThemedText>
          <ThemedText type="title" style={[styles.cardPrimaryText, styles.titleSpacing]}>
            Solicite seu personal
          </ThemedText>
          <ThemedText style={[styles.cardPrimaryText, styles.muted]}>
            Assim que o coach receber seu pedido, ele enviará uma mensagem com preços e horários disponíveis, em
            português.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Informações do pedido</ThemedText>
          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Quantas vezes na semana?</ThemedText>
            <TextInput
              value={timesPerWeek}
              onChangeText={setTimesPerWeek}
              keyboardType="numeric"
              placeholder="Ex.: 2"
              style={styles.input}
              maxLength={2}
            />
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Horários preferidos</ThemedText>
            <TextInput
              value={preferredTimes}
              onChangeText={setPreferredTimes}
              placeholder="Ex.: seg/qua às 7h ou 19h"
              style={styles.input}
            />
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Objetivo</ThemedText>
            <TextInput
              value={goal}
              onChangeText={setGoal}
              placeholder="Ex.: emagrecimento, força, condicionamento"
              style={styles.input}
              multiline
            />
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Academia/box</ThemedText>
            <TextInput
              value={gym}
              onChangeText={setGym}
              placeholder="Ex.: Unidade Vila Olímpia"
              style={styles.input}
            />
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Observações</ThemedText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Restrição, preferência de coach, forma de contato..."
              style={[styles.input, styles.multiline]}
              multiline
            />
          </View>
          <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
            <ThemedText type="defaultSemiBold" style={styles.submitText}>
              {submitting ? 'Enviando...' : 'Enviar pedido'}
            </ThemedText>
          </Pressable>
          <ThemedText style={styles.helperText}>
            O treinador confirmará disponibilidade e valores antes de fechar o pacote de personal.
          </ThemedText>
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
    marginBottom: 6,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#e9f4ff',
  },
  fieldGroup: {
    gap: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c2d9ef',
    fontSize: 16,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 4,
    backgroundColor: '#022a4c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitText: {
    color: '#fff',
  },
  helperText: {
    opacity: 0.72,
  },
  muted: {
    opacity: 0.75,
  },
});
