import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { useInstructorData } from '@/providers/instructor-data-provider';

export default function TrainingRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { trainingRequests, students, markTrainingRequestContacted } = useInstructorData();

  const sortedRequests = [...trainingRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const getStudentInfo = (studentUid: string) => {
    const student = students.find((item) => item.id === studentUid || item.userId === studentUid);

    if (student) {
      return {
        name: student.fullName,
        phone: student.phone || '—',
      };
    }

    const suffix = studentUid.slice(-4) || studentUid;
    return {
      name: `Aluno #${suffix}`,
      phone: '—',
    };
  };

  const handleMarkContacted = async (id: string) => {
    try {
      await markTrainingRequestContacted(id);
    } catch (error) {
      console.warn('Falha ao marcar pedido como contatado', error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
      edges={['left', 'right', 'bottom']}>
      <TopBar title="Pedidos de personal" fallbackHref="/instructor/dashboard" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Solicitações de treinamento individual
        </ThemedText>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Como usar</ThemedText>
          <ThemedText style={styles.muted}>
            Veja a frequência desejada, horários, objetivo e academia preferida. Ao contatar o cliente, marque o pedido
            como “contatado” para organizar seu funil.
          </ThemedText>
        </ThemedView>

        {sortedRequests.length === 0 ? (
          <ThemedView style={styles.card}>
            <ThemedText style={styles.muted}>Nenhum pedido de personal encontrado.</ThemedText>
            <Link href="/(tabs)" asChild>
              <Pressable style={styles.secondaryButton}>
                <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                  Voltar ao painel
                </ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        ) : (
          <ThemedView style={styles.listCard}>
            {sortedRequests.map((request) => {
              const info = getStudentInfo(request.studentUid);

              return (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestHeader}>
                    <View>
                      <ThemedText type="defaultSemiBold">{info.name}</ThemedText>

                      {/* ✅ NEW: phone (instructor convenience) */}
                      <ThemedText style={styles.mutedSmall}>Telefone: {info.phone}</ThemedText>

                      <ThemedText style={styles.mutedSmall}>
                        {new Date(request.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </ThemedText>
                    </View>

                    <ThemedView
                      style={[
                        styles.statusPill,
                        request.status === 'contacted' ? styles.statusContacted : styles.statusPending,
                      ]}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={request.status === 'contacted' ? styles.statusContactedText : styles.statusPendingText}>
                        {request.status === 'contacted' ? 'Contatado' : 'Pendente'}
                      </ThemedText>
                    </ThemedView>
                  </View>

                  <View style={styles.metaRow}>
                    <ThemedText type="defaultSemiBold">Frequência</ThemedText>
                    <ThemedText>{request.timesPerWeek}x por semana</ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <ThemedText type="defaultSemiBold">Horários</ThemedText>
                    <ThemedText>{request.preferredTimes}</ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <ThemedText type="defaultSemiBold">Objetivo</ThemedText>
                    <ThemedText style={styles.mutedSmall}>{request.goal}</ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <ThemedText type="defaultSemiBold">Academia/box</ThemedText>
                    <ThemedText>{request.gym}</ThemedText>
                  </View>
                  {request.notes ? (
                    <ThemedView style={styles.noteBox}>
                      <ThemedText type="defaultSemiBold">Observações</ThemedText>
                      <ThemedText style={styles.mutedSmall}>{request.notes}</ThemedText>
                    </ThemedView>
                  ) : null}

                  {request.status === 'pending' ? (
                    <Pressable style={styles.primaryButton} onPress={() => handleMarkContacted(request.id)}>
                      <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                        Marcar como contatado
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <ThemedText style={styles.mutedSmall}>
                      Marcado como contatado em{' '}
                      {request.contactedAt ? new Date(request.contactedAt).toLocaleDateString('pt-BR') : '—'}.
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </ThemedView>
        )}
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
    gap: 14,
  },
  heading: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
    backgroundColor: '#e9f4ff',
  },
  listCard: {
    borderRadius: 14,
    backgroundColor: '#f4faff',
    padding: 10,
    gap: 12,
  },
  requestItem: {
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d0e4f7',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPending: {
    backgroundColor: '#fff4e5',
  },
  statusContacted: {
    backgroundColor: '#e6f7ed',
  },
  statusPendingText: {
    color: '#a15c00',
  },
  statusContactedText: {
    color: '#0f5132',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  noteBox: {
    borderRadius: 10,
    backgroundColor: '#f0f7ff',
    padding: 10,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#022a4c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#022a4c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
  },
  muted: {
    opacity: 0.72,
  },
  mutedSmall: {
    opacity: 0.7,
    fontSize: 14,
  },
});
