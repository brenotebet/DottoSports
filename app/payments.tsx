import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useInstructorData } from '@/providers/instructor-data-provider';

export const options = { headerShown: false };

export default function PaymentsScreen() {
  const { user } = useAuth();
  const {
    ensureStudentProfile,
    cardOnFile,
    payOutstandingPayment,
    getStudentAccountSnapshot,
  } = useInstructorData();
  const [studentId, setStudentId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user) {
      const profile = ensureStudentProfile(user.email, user.displayName);
      setStudentId(profile.id);
    }
  }, [ensureStudentProfile, user]);

  const studentAccount = useMemo(
    () => (studentId ? getStudentAccountSnapshot(studentId) : null),
    [getStudentAccountSnapshot, studentId],
  );

  const studentBalances = useMemo(
    () => studentAccount?.outstanding ?? [],
    [studentAccount],
  );

  const totalDue = useMemo(
    () =>
      studentBalances.reduce(
        (sum, item) => sum + item.payment.amount,
        0,
      ),
    [studentBalances],
  );

  const handlePay = (paymentId: string) => {
    try {
      const { session } = payOutstandingPayment(paymentId);
      Alert.alert(
        'Pagamento confirmado',
        `Checkout ${session.id} confirmado. Atualizamos seu saldo e recibo.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível processar o pagamento.';
      Alert.alert('Falha no pagamento', message);
    }
  };

  const nextDue = studentBalances[0]?.payment.dueDate;

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['left', 'right', 'bottom']}>
      <TopBar title="Pagamentos" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.cardPrimary}>
          <ThemedText type="subtitle" style={styles.cardPrimaryText}>
            Saldo atual
          </ThemedText>
          <ThemedText type="title" style={[styles.titleSpacing, styles.cardPrimaryText]}>
            {totalDue > 0 ? `R$ ${totalDue.toFixed(2)}` : 'Nenhum valor pendente'}
          </ThemedText>
          <ThemedText style={[styles.cardPrimaryText, styles.muted]}>
            {nextDue ? `Próximo vencimento em ${nextDue}` : 'Tudo em dia neste momento.'}
          </ThemedText>
          <View style={styles.cardActions}>
            <View style={styles.cardBadge}>
              <IconSymbol name="creditcard" color="#0e9aed" size={18} />
              <ThemedText style={styles.cardBadgeText}>{cardOnFile.label}</ThemedText>
            </View>
            <Link href="/(tabs)/menu" asChild>
              <Pressable style={styles.secondaryAction}>
                <ThemedText type="defaultSemiBold" style={styles.secondaryActionText}>
                  Voltar ao menu
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Cobranças em aberto</ThemedText>
          {studentBalances.length === 0 ? (
            <ThemedText style={styles.muted}>Nenhuma cobrança pendente.</ThemedText>
          ) : (
            <View style={styles.balanceList}>
              {studentBalances.map(({ payment, invoice, status }) => (
                <ThemedView key={payment.id} style={styles.balanceItem}>
                  <View style={styles.balanceHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{payment.description}</ThemedText>
                      <ThemedText style={styles.muted}>
                        {invoice?.reference ?? payment.invoiceId ?? 'Fatura pendente'}
                      </ThemedText>
                    </View>
                    <StatusPill status={status} />
                  </View>
                  <View style={styles.balanceMeta}>
                    <ThemedText type="title">R$ {payment.amount.toFixed(2)}</ThemedText>
                    <ThemedText style={styles.muted}>Vencimento {payment.dueDate}</ThemedText>
                  </View>
                  <Pressable style={styles.payButton} onPress={() => handlePay(payment.id)}>
                    <ThemedText type="defaultSemiBold" style={styles.payButtonText}>
                      Pagar agora
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              ))}
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: 'pending' | 'overdue' | 'failed' | 'paid' }) {
  const label =
    status === 'pending'
      ? 'Pendente'
      : status === 'overdue'
        ? 'Em atraso'
        : status === 'failed'
          ? 'Falhou'
          : 'Pago';
  const background =
    status === 'failed'
      ? '#ffe5e5'
      : status === 'overdue'
        ? '#fff5e5'
        : status === 'paid'
          ? '#e7f8ed'
          : '#e5f6ff';
  const color =
    status === 'failed'
      ? '#b42318'
      : status === 'overdue'
        ? '#b54708'
        : status === 'paid'
          ? '#157347'
          : '#0b6fb6';

  return (
    <View style={[styles.pill, { backgroundColor: background }]}> 
      <ThemedText style={[styles.pillText, { color }]}>{label}</ThemedText>
    </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPrimary: {
    borderRadius: 16,
    padding: 18,
    gap: 10,
    backgroundColor: '#0e9aed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPrimaryText: {
    color: '#e9f6ff',
  },
  titleSpacing: {
    marginTop: 4,
    marginBottom: 4,
  },
  muted: {
    opacity: 0.78,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#e9f6ff',
  },
  cardBadgeText: {
    color: '#0e9aed',
    fontWeight: '600',
  },
  secondaryAction: {
    backgroundColor: '#094f7d',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  secondaryActionText: {
    color: '#e9f6ff',
  },
  balanceList: {
    gap: 12,
  },
  balanceItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f8ff',
    gap: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payButton: {
    backgroundColor: '#094f7d',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillText: {
    fontWeight: '600',
  },
});
