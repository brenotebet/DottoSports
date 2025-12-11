import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Slot,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type PropsWithChildren } from 'react';
import 'react-native-reanimated';
import { InteractionManager } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { InstructorDataProvider } from '@/providers/instructor-data-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate({ children }: PropsWithChildren) {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState(); // <- tells us when the root navigator is ready

  useEffect(() => {
    // 1) Wait for navigation to be ready
    if (!navState?.key) return;

    // 2) Wait for auth state to resolve
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    const task = InteractionManager.runAfterInteractions(() => {
      if (!user && !inAuthGroup) {
        // Not logged in and not already on auth routes -> go to login
        router.replace('/(auth)/login');
      } else if (user && inAuthGroup) {
        // Logged in but still inside auth group -> go to main app
        router.replace('/(tabs)');
      }
    });

    return () => task.cancel();
  }, [navState?.key, user, initializing, segments, router]);

  // IMPORTANT: never hide the Slot; always render children
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <InstructorDataProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate>
            {/* Root layout always renders a navigator (Slot) on the first render */}
            <Slot />
            <StatusBar style="auto" />
          </AuthGate>
        </ThemeProvider>
      </InstructorDataProvider>
    </AuthProvider>
  );
}
