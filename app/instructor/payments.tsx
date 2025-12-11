import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';

const formatBRL = (amount: number) => `R$ ${amount.toFixed(2)}`;

export default function InstructorPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const {
    outstandingBalances,
    paymentIntents,
    paymentSessions,
    receipts,
    settlements,
    enrollments,
    createPaymentIntentForEnrollment,
    startPaymentSession,
    processPaymentWebhook,
  } = useInstructorData();

  const findIntentForPayment = (paymentId: string) =>
    paymentIntents.find((intent) => intent.paymentId === paymentId);

  const findSessionForIntent = (intentId?: string) =>
    intentId ? paymentSessions.find((session) => session.intentId === intentId) : undefined;

  const handleStartCheckout = (
    paymentId: string,
    enrollmentId: string | undefined,
    amount: number,
    method: 'credit_card' | 'pix' | 'cash',
    description?: string,
  ) => {
    let intent = findIntentForPayment(paymentId);

    if (!intent && enrollmentId) {
      intent = createPaymentIntentForEnrollment(
        enrollmentId,
        amount,
        method,
        description ?? 'Cobrança rápida',
      );
    }

    if (!intent) {
      Alert.alert('Intent não encontrada', 'Não foi possível iniciar o checkout.');
      return;
    }

    const session = startPaymentSession(intent.id, intent);
    Alert.alert('Sessão criada', `Checkout criado: ${session.checkoutUrl}`);
  };

  const handleWebhookSimulation = (
    paymentId: string,
    outcome: 'succeeded' | 'failed',
  ) => {
    const intent = findIntentForPayment(paymentId);
    const session = findSessionForIntent(intent?.id);

    if (!intent || !session) {
      Alert.alert('Sessão ausente', 'Inicie um checkout antes de simular o webhook.');
      return;
    }

    processPaymentWebhook(
      session.id,
      outcome,
      outcome === 'failed' ? 'Falha simulada pelo instrutor' : undefined,
    );

    Alert.alert(
      'Webhook recebido',
      outcome === 'succeeded'
        ? 'Pagamento marcado como pago e recibo emitido.'
        : 'Cobrança marcada como falha. O aluno deve tentar novamente.',
    );
  };

  const recentReceipts = receipts.slice(0, 4);

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Cobranças e liquidações
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Saldos em aberto</ThemedText>
          {outstandingBalances.length === 0 && (
            <ThemedText style={styles.muted}>Nenhuma pendência no momento.</ThemedText>
          )}
          {outstandingBalances.map((item) => {
            const enrollment = enrollments.find((en) => en.id === item.payment.enrollmentId);
            const studentName = item.student?.fullName ?? 'Aluno sem nome';
            return (
              <View key={item.payment.id} style={styles.balanceRow}>
                <View style={styles.balanceHeader}>
                  <View style={styles.balanceText}>
                    <ThemedText type="defaultSemiBold">{item.payment.description ?? 'Cobrança'}</ThemedText>
                    <ThemedText style={styles.muted}>
                      {formatBRL(item.payment.amount)} · vencimento {item.payment.dueDate}
                    </ThemedText>
                    <ThemedText style={styles.muted}>
                      {enrollment ? `Turma: ${enrollment.classId}` : 'Sem vínculo de matrícula'}
                    </ThemedText>
                    <ThemedText style={styles.muted}>
                      {`Aluno: ${studentName}${item.email ? ` • ${item.email}` : ''}`}
                    </ThemedText>
                  </View>
                  <ThemedView
                    style={[
                      styles.badge,
                      item.status === 'pending' && styles.badgePending,
                      item.status === 'overdue' && styles.badgeOverdue,
                      item.status === 'failed' && styles.badgeFailed,
                    ]}>
                    <ThemedText type="defaultSemiBold" style={styles.badgeText}>
                      {item.status === 'pending'
                        ? 'Pendente'
                        : item.status === 'overdue'
                          ? 'Em atraso'
                          : 'Falhou'}
                    </ThemedText>
                  </ThemedView>
                </View>

                <View style={styles.actionColumn}>
                  <Pressable
                    style={styles.linkButton}
                    onPress={() =>
                      handleStartCheckout(
                        item.payment.id,
                        item.payment.enrollmentId,
                        item.payment.amount,
                        item.payment.method,
                        item.payment.description,
                      )
                    }>
                    <ThemedText type="defaultSemiBold" style={styles.linkButtonText}>
                      Abrir checkout
                    </ThemedText>
                  </Pressable>
                  <View style={styles.webhookRow}>
                    <Pressable
                      style={[styles.webhookButton, styles.successButton]}
                      onPress={() => handleWebhookSimulation(item.payment.id, 'succeeded')}>
                      <ThemedText type="defaultSemiBold" style={styles.webhookText}>
                        Webhook sucesso
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.webhookButton, styles.failButton]}
                      onPress={() => handleWebhookSimulation(item.payment.id, 'failed')}>
                      <ThemedText type="defaultSemiBold" style={[styles.webhookText, styles.failText]}>
                        Webhook falha
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Recibos emitidos</ThemedText>
          {recentReceipts.length === 0 && (
            <ThemedText style={styles.muted}>Nenhum recibo disponível.</ThemedText>
          )}
          {recentReceipts.map((receipt) => (
            <View key={receipt.id} style={styles.receiptRow}>
              <View style={styles.balanceText}>
                <ThemedText type="defaultSemiBold">{receipt.reference}</ThemedText>
                <ThemedText style={styles.muted}>Emitido em {receipt.issuedAt.slice(0, 10)}</ThemedText>
              </View>
              <ThemedText style={styles.linkButtonText}>Ver PDF</ThemedText>
            </View>
          ))}
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Histórico de liquidação</ThemedText>
          {settlements.map((settlement) => (
            <View key={settlement.id} style={styles.settlementRow}>
              <View style={styles.balanceText}>
                <ThemedText type="defaultSemiBold">{settlement.period}</ThemedText>
                <ThemedText style={styles.muted}>
                  Depositado em {new Date(settlement.depositedAt).toLocaleDateString('pt-BR')}
                </ThemedText>
              </View>
              <View style={styles.settlementNumbers}>
                <ThemedText type="defaultSemiBold">{formatBRL(settlement.net)}</ThemedText>
                <ThemedText style={styles.muted}>
                  {formatBRL(settlement.gross)} bruto · {formatBRL(settlement.fees)} taxas
                </ThemedText>
              </View>
            </View>
          ))}
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
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: '#e9f4ff',
  },
  muted: {
    opacity: 0.75,
  },
  balanceRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 12,
    gap: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  balanceText: {
    gap: 4,
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgePending: {
    backgroundColor: '#fff2d6',
  },
  badgeOverdue: {
    backgroundColor: '#ffd6d6',
  },
  badgeFailed: {
    backgroundColor: '#ffe4f0',
  },
  badgeText: {
    color: '#1b1b1b',
  },
  actionColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
    alignSelf: 'stretch',
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0b3d67',
    borderRadius: 12,
  },
  linkButtonText: {
    color: 'white',
  },
  webhookRow: {
    flexDirection: 'row',
    gap: 8,
  },
  webhookButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  successButton: {
    backgroundColor: '#d1f5e1',
  },
  failButton: {
    backgroundColor: '#ffe5e5',
  },
  webhookText: {
    color: '#0c2d4a',
  },
  failText: {
    color: '#a1133a',
  },
  receiptRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementNumbers: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
