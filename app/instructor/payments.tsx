import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';

const formatBRL = (amount: number) => `R$ ${amount.toFixed(2)}`;

export default function InstructorPaymentsScreen() {
  const { classes, outstandingBalances, receipts, rosterByClass, settlements, enrollments } =
    useInstructorData();
  const insets = useSafeAreaInsets();

  const classSummaries = classes.map((trainingClass) => {
    const roster = rosterByClass[trainingClass.id] ?? [];
    const outstandingForClass = outstandingBalances.filter((item) => {
      const enrollment = enrollments.find((en) => en.id === item.payment.enrollmentId);
      return enrollment?.classId === trainingClass.id;
    });

    const pendingCount = outstandingForClass.filter((item) => item.status === 'pending').length;
    const overdueCount = outstandingForClass.filter((item) => item.status === 'overdue').length;

    return { trainingClass, roster, pendingCount, overdueCount };
  });

  const recentReceipts = receipts.slice(0, 4);

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['left', 'right', 'bottom']}>
      <TopBar title="Cobranças e pagamentos" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Cobranças por turma</ThemedText>
          <ThemedText style={styles.muted}>
            Organize as pendências navegando por turma antes de abrir cada cobrança.
          </ThemedText>

          {classSummaries.length === 0 && (
            <ThemedText style={styles.muted}>Nenhuma turma com pagamentos para monitorar.</ThemedText>
          )}

          {classSummaries.map(({ trainingClass, roster, pendingCount, overdueCount }) => (
            <Link
              key={trainingClass.id}
              href={{ pathname: '/instructor/payments/[classId]', params: { classId: trainingClass.id } }}
              asChild>
              <Pressable style={styles.balanceRow}>
                <View style={styles.balanceHeader}>
                  <View style={styles.balanceText}>
                    <ThemedText type="defaultSemiBold">{trainingClass.title}</ThemedText>
                    <ThemedText style={styles.muted}>
                      {trainingClass.schedule
                        .map(
                          (slot) =>
                            `${slot.day} ${slot.start}-${slot.end} (${slot.startDate ?? 'início imediato'} a ${slot.endDate ?? 'sem data final'})`,
                        )
                        .join(' · ')}
                    </ThemedText>
                    <ThemedText style={styles.muted}>{roster.length} alunos matriculados</ThemedText>
                  </View>
                  <View style={styles.tagRow}>
                    <ThemedView style={[styles.badge, styles.badgePending]}>
                      <ThemedText type="defaultSemiBold" style={styles.badgeText}>
                        {pendingCount} pendente(s)
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={[styles.badge, styles.badgeOverdue]}>
                      <ThemedText type="defaultSemiBold" style={styles.badgeText}>
                        {overdueCount} em atraso
                      </ThemedText>
                    </ThemedView>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
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
    flexWrap: 'wrap',
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
  badgeText: {
    color: '#1b1b1b',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  linkButtonText: {
    color: '#0b3d67',
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
