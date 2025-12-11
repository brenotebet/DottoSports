import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoleGuard } from '@/hooks/use-role-guard';

export default function InstructorLayout() {
  useRoleGuard(['INSTRUCTOR', 'ADMIN']);
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors[colorScheme ?? 'light'].background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors[colorScheme ?? 'light'].background },
      }}>
      <Stack.Screen name="dashboard" options={{ title: 'Painel do instrutor' }} />
      <Stack.Screen name="classes" options={{ title: 'Aulas e sessões' }} />
      <Stack.Screen name="payments" options={{ title: 'Cobranças e pagamentos' }} />
    </Stack>
  );
}
