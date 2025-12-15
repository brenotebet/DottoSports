import { Stack } from 'expo-router';


export default function ClassCatalogLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="registered" />
      <Stack.Screen name="[classId]" />
    </Stack>
  );
}
