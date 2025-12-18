import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import type { StudentPlan } from '@/constants/schema';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useInstructorData } from '@/providers/instructor-data-provider';

export const options = { headerShown: false };

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { ensureStudentProfile, planOptions, getActivePlanForStudent, selectPlanForStudent } = useInstructorData();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<StudentPlan['billing']>('recurring');

  useEffect(() => {
    if (user) {
      const profile = ensureStudentProfile(user.email, user.displayName);
      setStudentId(profile.id);
    }
  }, [ensureStudentProfile, user]);

  const activePlan = useMemo(
    () => (studentId ? getActivePlanForStudent(studentId) : undefined),
    [getActivePlanForStudent, studentId],
  );

  const activePlanOption = useMemo(
    () => planOptions.find((option) => option.id === activePlan?.planOptionId),
    [activePlan?.planOptionId, planOptions],
  );

  const sortedPlanOptions = useMemo(
    () =>
      [...planOptions].sort(
        (a, b) => a.weeklyClasses - b.weeklyClasses || a.durationMonths - b.durationMonths,
      ),
    [planOptions],
  );

  const durationOptions = useMemo(
    () =>
      Array.from(new Set(sortedPlanOptions.map((option) => option.durationMonths))).sort((a, b) => a - b),
    [sortedPlanOptions],
  );

  const [selectedDuration, setSelectedDuration] = useState<number>(durationOptions[0] ?? 1);

  const availableWeeklyOptions = useMemo(
    () =>
      sortedPlanOptions
        .filter((option) => option.durationMonths === selectedDuration)
        .map((option) => option.weeklyClasses)
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort((a, b) => a - b),
    [selectedDuration, sortedPlanOptions],
  );

  const [selectedWeekly, setSelectedWeekly] = useState<number>(availableWeeklyOptions[0] ?? 2);

  useEffect(() => {
    if (activePlanOption) {
      setSelectedDuration(activePlanOption.durationMonths);
      setSelectedWeekly(activePlanOption.weeklyClasses);
      setBillingCycle(activePlan?.billing ?? 'recurring');
    }
  }, [activePlan?.billing, activePlanOption]);

  useEffect(() => {
    if (!availableWeeklyOptions.includes(selectedWeekly)) {
      setSelectedWeekly(availableWeeklyOptions[0] ?? selectedWeekly);
    }
  }, [availableWeeklyOptions, selectedWeekly]);

  const selectedOption = useMemo(
    () =>
      sortedPlanOptions.find(
        (option) => option.durationMonths === selectedDuration && option.weeklyClasses === selectedWeekly,
      ),
    [selectedDuration, selectedWeekly, sortedPlanOptions],
  );

  const selectionMatchesActive = Boolean(
    activePlanOption &&
      activePlan?.billing === billingCycle &&
      activePlanOption.durationMonths === selectedDuration &&
      activePlanOption.weeklyClasses === selectedWeekly,
  );

  const amountDue = selectedOption
    ? billingCycle === 'recurring'
      ? selectedOption.priceMonthly
      : selectedOption.priceUpfront
    : 0;

  const handleSelectPlan = async (planOptionId: string) => {
    if (!studentId) return;

    try {
      await selectPlanForStudent(studentId, planOptionId, billingCycle);
      Alert.alert(
        activePlan ? 'Plano atualizado' : 'Plano salvo',
        billingCycle === 'recurring'
          ? 'Cobraremos mensalmente este plano com recorrência automática.'
          : 'Plano pago à vista selecionado. Ajuste de cobrança registrado.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar seu plano agora.';
      Alert.alert('Erro ao salvar plano', message);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['left', 'right', 'bottom']}>
      <TopBar title="Gerenciar conta" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.cardPrimary}>
          <ThemedText type="subtitle" style={styles.cardPrimaryText}>
            Plano e recorrência
          </ThemedText>
          <ThemedText style={[styles.cardPrimaryText, styles.muted]}>
            Ajuste suas combinações de aulas semanais e escolha o tipo de cobrança preferido.
          </ThemedText>

          <View style={styles.billingToggle}>
            <Pressable
              style={[styles.toggleButton, billingCycle === 'recurring' && styles.toggleButtonActive]}
              onPress={() => setBillingCycle('recurring')}>
              <ThemedText type="defaultSemiBold" style={billingCycle === 'recurring' ? styles.toggleTextActive : undefined}>
                Mensal recorrente
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, billingCycle === 'upfront' && styles.toggleButtonActive]}
              onPress={() => setBillingCycle('upfront')}>
              <ThemedText type="defaultSemiBold" style={billingCycle === 'upfront' ? styles.toggleTextActive : undefined}>
                Pagamento à vista
              </ThemedText>
            </Pressable>
          </View>

          {activePlanOption ? (
            <ThemedView style={styles.activePlan}>
              <ThemedText type="defaultSemiBold">Plano atual</ThemedText>
              <ThemedText style={styles.muted}>
                {activePlanOption.weeklyClasses}x na semana · {activePlanOption.durationMonths} meses ·{' '}
                {activePlan?.billing === 'recurring'
                  ? `R$ ${activePlanOption.priceMonthly.toFixed(0)}/mês`
                  : `R$ ${activePlanOption.priceUpfront.toFixed(0)} à vista`}
              </ThemedText>
            </ThemedView>
          ) : null}

          <View style={styles.dropdownGroup}>
            <View style={styles.dropdownField}>
              <ThemedText type="defaultSemiBold">Duração</ThemedText>
              <ThemedText style={styles.muted}>Edite seu plano sem adicionar novas assinaturas.</ThemedText>
              <View style={styles.dropdownOptions}>
                {durationOptions.map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.dropdownChip, selectedDuration === option && styles.dropdownChipActive]}
                    onPress={() => setSelectedDuration(option)}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={selectedDuration === option ? styles.dropdownTextActive : undefined}>
                      {option} mês{option > 1 ? 'es' : ''}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.dropdownField}>
              <ThemedText type="defaultSemiBold">Aulas por semana</ThemedText>
              <ThemedText style={styles.muted}>Mostramos apenas opções disponíveis para esta duração.</ThemedText>
              <View style={styles.dropdownOptions}>
                {availableWeeklyOptions.map((option) => (
                  <Pressable
                    key={`${selectedDuration}-${option}`}
                    style={[styles.dropdownChip, selectedWeekly === option && styles.dropdownChipActive]}
                    onPress={() => setSelectedWeekly(option)}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={selectedWeekly === option ? styles.dropdownTextActive : undefined}>
                      {option}x na semana
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <ThemedView style={styles.amountCard}>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle">Valor a pagar</ThemedText>
              <ThemedText style={styles.muted}>
                {billingCycle === 'recurring'
                  ? 'Cobraremos este valor mensalmente enquanto o plano estiver ativo.'
                  : 'Cobrança única antecipada para todo o período selecionado.'}
              </ThemedText>
            </View>
            <ThemedText type="title">R$ {amountDue.toFixed(0)}</ThemedText>
          </ThemedView>

          <Pressable
            style={[styles.primaryButton, (!selectedOption || selectionMatchesActive) && styles.primaryButtonDisabled]}
            disabled={!selectedOption || selectionMatchesActive}
            onPress={() => selectedOption && handleSelectPlan(selectedOption.id)}>
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              {selectedOption ? (activePlan ? 'Atualizar plano' : 'Confirmar plano') : 'Selecione uma combinação'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.card}> 
          <ThemedText type="subtitle">Pagamentos e cobranças</ThemedText>
          <ThemedText style={styles.muted}>
            Verifique boletos em aberto, faturas emitidas e recibos no painel dedicado de pagamentos.
          </ThemedText>
          <Link href="/payments" asChild>
            <Pressable style={styles.secondaryButton}>
              <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                Ir para pagamentos
              </ThemedText>
            </Pressable>
          </Link>
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
  cardPrimary: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#0e9aed',
  },
  cardPrimaryText: {
    color: '#e9f6ff',
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: '#f5f9ff',
    borderWidth: 1,
    borderColor: '#dce9f5',
  },
  billingToggle: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d2e6f7',
  },
  toggleButtonActive: {
    backgroundColor: '#022a4c',
    borderColor: '#022a4c',
  },
  toggleTextActive: {
    color: '#fff',
  },
  activePlan: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cde3f5',
  },
  dropdownGroup: {
    gap: 14,
  },
  dropdownField: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe8f5',
    gap: 8,
  },
  dropdownOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cde3f5',
    backgroundColor: '#f7fbff',
  },
  dropdownChipActive: {
    backgroundColor: '#022a4c',
    borderColor: '#022a4c',
  },
  dropdownTextActive: {
    color: '#fff',
  },
  amountCard: {
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#dbe8f5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#022a4c',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#e9f6ff',
  },
  primaryButtonDisabled: {
    backgroundColor: '#c9e5f7',
  },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: '#094f7d',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e9f6ff',
  },
  muted: {
    opacity: 0.78,
  },
});
