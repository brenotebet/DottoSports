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
        headerShown: false,
        contentStyle: { backgroundColor: Colors[colorScheme ?? 'light'].background },
      }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="classes" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="payments/[classId]" />
      <Stack.Screen name="rosters/index" />
      <Stack.Screen name="rosters/[classId]" />
    </Stack>
  );
}
