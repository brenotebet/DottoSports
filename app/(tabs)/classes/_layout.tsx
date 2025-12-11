import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function ClassCatalogLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#e9f4ff' },
        headerTintColor: Colors.light.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitleVisible: false,
        headerTitleAlign: 'left',
      }}>
      <Stack.Screen name="index" options={{ title: 'Catálogo de aulas' }} />
      <Stack.Screen
        name="[classId]"
        options={{
          title: 'Detalhes da aula',
          headerStyle: { backgroundColor: '#0e9aed' },
          headerTintColor: '#022a4c',
          headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        }}
      />
    </Stack>
  );
}
