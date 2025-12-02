import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const upcomingClass = {
  title: 'CrossFit Engine',
  time: 'Today · 6:00 PM',
  coach: 'Coach Riley',
  location: 'Main Floor',
};

const payment = {
  dueDate: 'Dec 15',
  amount: '$95.00',
};

const highlights = [
  { label: 'Workout streak', value: '7 days' },
  { label: 'Classes this week', value: '4 booked' },
  { label: 'PR focus', value: 'Snatch technique' },
];

export default function DashboardScreen() {
  const colorScheme = useColorScheme();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Welcome back, athlete!
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Next class</ThemedText>
        <ThemedText type="title" style={styles.titleSpacing}>
          {upcomingClass.title}
        </ThemedText>
        <ThemedText>{upcomingClass.time}</ThemedText>
        <ThemedText>{upcomingClass.location}</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.muted}>
          with {upcomingClass.coach}
        </ThemedText>
        <Pressable style={styles.checkInButton}>
          <ThemedText type="defaultSemiBold" style={styles.checkInText}>
            Check in
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.row}>
        <ThemedView style={[styles.card, styles.flexItem]}>
          <ThemedText type="subtitle">Next payment</ThemedText>
          <ThemedText type="title" style={styles.titleSpacing}>
            {payment.amount}
          </ThemedText>
          <ThemedText>Due {payment.dueDate}</ThemedText>
        </ThemedView>
        <ThemedView style={[styles.card, styles.flexItem]}>
          <ThemedText type="subtitle">Stopwatch</ThemedText>
          <ThemedText style={styles.muted}>Intervals & classic timer</ThemedText>
          <Link href="/stopwatch" asChild>
            <Pressable style={styles.iconLink}>
              <IconSymbol
                name="stopwatch.fill"
                color={Colors[colorScheme ?? 'light'].tint}
                size={28}
              />
              <ThemedText type="defaultSemiBold">Open</ThemedText>
            </Pressable>
          </Link>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Progress quick look</ThemedText>
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  heading: {
    marginTop: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  titleSpacing: {
    marginTop: 4,
    marginBottom: 4,
  },
  muted: {
    opacity: 0.7,
  },
  checkInButton: {
    marginTop: 8,
    backgroundColor: '#0f766e',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkInText: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexItem: {
    flex: 1,
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
    width: '47%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    gap: 4,
  },
});
