import { Stack } from 'expo-router';

export default function ClassCatalogLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Catálogo de aulas' }} />
      <Stack.Screen name="[classId]" options={{ title: 'Detalhes da aula' }} />
    </Stack>
  );
}
