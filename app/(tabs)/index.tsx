import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const upcomingClass = {
  title: 'Cross Training Power',
  time: 'Hoje · 18:00',
  coach: 'Coach Marina',
  location: 'Área principal',
};

const payment = {
  dueDate: '15 Dez',
  amount: 'R$ 95,00',
};

const highlights = [
  { label: 'Sequência de treinos', value: '7 dias' },
  { label: 'Aulas nesta semana', value: '4 agendadas' },
  { label: 'Foco do mês', value: 'Técnica de Snatch' },
];

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Bem-vindo(a) de volta!
        </ThemedText>

        <ThemedView style={styles.cardPrimary}>
          <ThemedText type="subtitle" style={styles.cardPrimaryText}>Próxima aula</ThemedText>
          <ThemedText type="title" style={[styles.titleSpacing, styles.cardPrimaryText]}>
            {upcomingClass.title}
          </ThemedText>
          <ThemedText style={styles.cardPrimaryText}>{upcomingClass.time}</ThemedText>
          <ThemedText style={styles.cardPrimaryText}>{upcomingClass.location}</ThemedText>
          <ThemedText type="defaultSemiBold" style={[styles.muted, styles.cardPrimaryText]}>
            com {upcomingClass.coach}
          </ThemedText>
          <Pressable style={styles.checkInButton}>
            <ThemedText type="defaultSemiBold" style={styles.checkInText}>
              Confirmar presença
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.row}>
          <ThemedView style={[styles.card, styles.flexItem]}>
            <ThemedText type="subtitle">Próximo pagamento</ThemedText>
            <ThemedText type="title" style={styles.titleSpacing}>
              {payment.amount}
            </ThemedText>
            <ThemedText>Vencimento {payment.dueDate}</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.card, styles.flexItem]}>
            <ThemedText type="subtitle">Cronômetro</ThemedText>
            <ThemedText style={styles.muted}>Intervalos e timer clássico</ThemedText>
            <Link href="/stopwatch" asChild>
              <Pressable style={styles.iconLink}>
                <IconSymbol
                  name="stopwatch.fill"
                  color={Colors[colorScheme ?? 'light'].tint}
                  size={28}
                />
                <ThemedText type="defaultSemiBold">Abrir</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.card}> 
          <ThemedText type="subtitle">Resumo rápido</ThemedText>
          <View style={styles.highlightGrid}>
            {highlights.map((item) => (
              <ThemedView key={item.label} style={styles.highlightItem}>
                <ThemedText type="defaultSemiBold">{item.value}</ThemedText>
                <ThemedText style={styles.muted}>{item.label}</ThemedText>
              </ThemedView>
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
    paddingBottom: 28,
    gap: 16,
  },
  heading: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
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
    gap: 8,
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
    opacity: 0.82,
  },
  checkInButton: {
    marginTop: 10,
    backgroundColor: '#022a4c',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkInText: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  flexItem: {
    flex: 1,
    minWidth: '48%',
  },
  iconLink: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  highlightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  highlightItem: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f8ff',
    gap: 6,
  },
});
