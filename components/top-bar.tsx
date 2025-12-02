import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from './ui/icon-symbol';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}> 
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={() => router.back()}
        style={styles.backButton}>
        <IconSymbol name="chevron.left" size={22} color="#022a4c" />
      </Pressable>
      <ThemedText type="subtitle" style={styles.title}>
        {title || 'Voltar'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.light.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e6f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(2,42,76,0.08)',
  },
  title: {
    marginLeft: 12,
    color: '#022a4c',
  },
});
