import { Stack } from 'expo-router';


export default function ClassCatalogLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#0e9aed' },
        headerTintColor: '#022a4c',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}>
      <Stack.Screen name="index" options={{ title: 'Catálogo de aulas' }} />
      <Stack.Screen name="registered" options={{ title: 'Aulas inscritas' }} />
      <Stack.Screen
        name="[classId]"
        options={{
          title: 'Detalhes da aula',
        }}
      />
    </Stack>
  );
}
