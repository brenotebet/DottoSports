import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const actions = [
  { title: 'Gerenciar conta', description: 'Atualize plano, dados pessoais e preferências.' },
  { title: 'Definir meta', description: 'Cadastre um novo objetivo de força ou condicionamento.' },
  { title: 'Fale conosco', description: 'Envie uma mensagem rápida para a equipe do box.' },
  { title: 'Realizar pagamento', description: 'Quite mensalidades ou pagamentos avulsos.' },
  { title: 'Notificações', description: 'Controle lembretes e alertas das aulas.' },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();

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
            {actions.map((item) => (
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
