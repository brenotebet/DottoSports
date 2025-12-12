import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useInstructorData } from '@/providers/instructor-data-provider';

export const options = { headerShown: false };

export default function ClassCatalogScreen() {
  const colorScheme = useColorScheme();
  const { classes, sessions, getCapacityUsage } = useInstructorData();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const categories = useMemo(
    () => ['all', ...new Set(classes.map((item) => item.category))],
    [classes],
  );
  const levels = ['all', 'beginner', 'intermediate', 'advanced'];

  const filteredClasses = useMemo(() => {
    return classes.filter((trainingClass) => {
      if (categoryFilter !== 'all' && trainingClass.category !== categoryFilter) return false;
      if (levelFilter !== 'all' && trainingClass.level !== levelFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchTitle = trainingClass.title.toLowerCase().includes(term);
        const matchTags = trainingClass.tags.some((tag) => tag.toLowerCase().includes(term));
        if (!matchTitle && !matchTags) return false;
      }
      return true;
    });
  }, [categoryFilter, classes, levelFilter, search]);

  const resolveNextSession = (classId: string) => {
    const futureSessions = sessions
      .filter((session) => session.classId === classId)
      .sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    return futureSessions[0];
  };

  const renderChip = (label: string, active: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive, active && { borderColor: Colors[colorScheme ?? 'light'].tint }]}>
      <ThemedText
        type="defaultSemiBold"
        style={[styles.chipText, active && { color: '#0e426a' }]}>
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedText type="title" style={styles.heading}>
          Encontre sua próxima aula
        </ThemedText>
        <ThemedText style={styles.leadText}>
          Filtre por modalidade, nível e confira a capacidade em tempo real antes de se inscrever.
        </ThemedText>

        <ThemedView style={styles.searchCard}>
          <TextInput
            placeholder="Buscar por nome ou tag"
            placeholderTextColor={colorScheme === 'dark' ? '#7a8695' : '#7d8a96'}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { borderColor: Colors[colorScheme ?? 'light'].icon }]}
          />

          <View style={styles.filterRow}>
            <ThemedText type="defaultSemiBold">Categorias</ThemedText>
            <View style={styles.chipRow}>
              {categories.map((category) =>
                renderChip(
                  category === 'all' ? 'Todas' : category,
                  categoryFilter === category,
                  () => setCategoryFilter(category),
                  category,
                ),
              )}
            </View>
          </View>

          <View style={styles.filterRow}>
            <ThemedText type="defaultSemiBold">Nível</ThemedText>
            <View style={styles.chipRow}>
              {levels.map((level) =>
                renderChip(level === 'all' ? 'Todos' : level, levelFilter === level, () => setLevelFilter(level), level),
              )}
            </View>
          </View>
        </ThemedView>

        <View style={styles.list}>
          {filteredClasses.map((trainingClass) => {
            const capacity = getCapacityUsage(trainingClass.id);
            const nextSession = resolveNextSession(trainingClass.id);
            return (
              <Link key={trainingClass.id} href={`/classes/${trainingClass.id}`} asChild>
                <Pressable style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleBlock}>
                      <ThemedText type="subtitle">{trainingClass.title}</ThemedText>
                      <ThemedText style={styles.muted}>{trainingClass.description}</ThemedText>
                    </View>
                    <ThemedView style={styles.capacityPill}>
                      <ThemedText type="defaultSemiBold" style={styles.capacityText}>
                        {capacity.available} vagas
                      </ThemedText>
                    </ThemedView>
                  </View>

                  <View style={styles.tagRow}>
                    <ThemedView style={styles.badge}>
                      <ThemedText style={styles.badgeText}>{trainingClass.category}</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.badge}>
                      <ThemedText style={styles.badgeText}>{trainingClass.level}</ThemedText>
                    </ThemedView>
                    {trainingClass.tags.slice(0, 3).map((tag) => (
                      <ThemedView key={`${trainingClass.id}-${tag}`} style={styles.badge}>
                        <ThemedText style={styles.badgeText}>{tag}</ThemedText>
                      </ThemedView>
                    ))}
                  </View>

                  {nextSession && (
                    <ThemedView style={styles.sessionRow}>
                      <ThemedText type="defaultSemiBold">
                        Próxima sessão:
                      </ThemedText>
                      <ThemedText>
                        {new Date(nextSession.startTime).toLocaleString('pt-BR', {
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {nextSession.location}
                      </ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
              </Link>
            );
          })}
          {filteredClasses.length === 0 && (
            <ThemedText style={styles.muted}>
              Nenhuma aula encontrada. Ajuste os filtros ou tente outro termo.
            </ThemedText>
          )}
        </View>
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
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  heading: {
    marginBottom: 4,
  },
  leadText: {
    opacity: 0.75,
    lineHeight: 20,
  },
  searchCard: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
    backgroundColor: '#e9f4ff',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.sans,
    backgroundColor: '#fff',
  },
  filterRow: {
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#cde4f9',
  },
  chipActive: {
    backgroundColor: '#d9efff',
  },
  chipText: {
    textTransform: 'capitalize',
  },
  list: {
    gap: 12,
    paddingBottom: 12,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#f5f9ff',
    gap: 10,
    borderWidth: 1,
    borderColor: '#dce9f5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  capacityPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#0e9aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  capacityText: {
    color: '#fff',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#e6f2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    textTransform: 'capitalize',
  },
  sessionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
    gap: 4,
  },
  muted: {
    opacity: 0.68,
  },
});
