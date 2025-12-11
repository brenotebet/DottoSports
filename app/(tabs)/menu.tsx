import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

const actions = [
  { title: 'Gerenciar conta', description: 'Atualize plano, dados pessoais e preferências.' },
  { title: 'Definir meta', description: 'Cadastre um novo objetivo de força ou condicionamento.' },
  { title: 'Fale conosco', description: 'Envie uma mensagem rápida para a equipe do box.' },
  { title: 'Realizar pagamento', description: 'Quite mensalidades ou pagamentos avulsos.' },
  { title: 'Notificações', description: 'Controle lembretes e alertas das aulas.' },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { hasRole } = useAuth();

  const showPaymentTile = false;
  const visibleActions = showPaymentTile
    ? actions
    : actions.filter((item) => item.title !== 'Realizar pagamento');

  const instructorActions = hasRole(['INSTRUCTOR', 'ADMIN'])
    ? [
        { title: 'Painel do instrutor', href: '/instructor/dashboard' as const },
        { title: 'Aulas e sessões', href: '/instructor/classes' as const },
        { title: 'Cobranças e pagamentos', href: '/instructor/payments' as const },
      ]
    : [];

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}> 
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Menu e conta
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Ações rápidas</ThemedText>
          <View style={styles.list}>
            {visibleActions.map((item) => (
              <Pressable key={item.title} style={styles.listItem}>
                <View style={styles.listText}>
                  <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                  <ThemedText style={styles.muted}>{item.description}</ThemedText>
                </View>
                <ThemedText type="default">›</ThemedText>
              </Pressable>
            ))}
          </View>
        </ThemedView>

        {instructorActions.length > 0 && (
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Área do instrutor</ThemedText>
            <View style={styles.list}>
              {instructorActions.map((item) => (
                <Link key={item.title} href={item.href} asChild>
                  <Pressable style={styles.listItem}>
                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                    <ThemedText type="default">›</ThemedText>
                  </Pressable>
                </Link>
              ))}
            </View>
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
  list: {
    gap: 10,
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listText: {
    flex: 1,
    gap: 4,
  },
  muted: {
    opacity: 0.7,
  },
});
