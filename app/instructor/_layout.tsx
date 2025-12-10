import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { InstructorDataProvider } from '@/providers/instructor-data-provider';

export default function InstructorLayout() {
  useRoleGuard(['INSTRUCTOR', 'ADMIN']);
  const colorScheme = useColorScheme();

  return (
    <InstructorDataProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors[colorScheme ?? 'light'].background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors[colorScheme ?? 'light'].background },
        }}>
        <Stack.Screen name="dashboard" options={{ title: 'Painel do instrutor' }} />
        <Stack.Screen name="classes" options={{ title: 'Aulas e sessões' }} />
      </Stack>
    </InstructorDataProvider>
  );
}
