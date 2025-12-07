import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Entrar', headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: 'Criar conta', headerShown: false }} />
    </Stack>
  );
}
