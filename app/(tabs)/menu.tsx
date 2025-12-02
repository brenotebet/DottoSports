import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const actions = [
  { title: 'Manage account', description: 'Update membership, details, and preferences.' },
  { title: 'Insert goal', description: 'Set a new strength or conditioning target.' },
  { title: 'Contact us', description: 'Message the gym staff for quick support.' },
  { title: 'Make payment', description: 'Complete dues or drop-in payments.' },
  { title: 'Notifications', description: 'Control reminders and class alerts.' },
];

export default function MenuScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Menu & account
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Quick actions</ThemedText>
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
    gap: 12,
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
