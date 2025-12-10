import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

import type { UserRole } from '@/constants/schema';
import { useAuth } from '@/providers/auth-provider';

type UseRoleGuardOptions = {
  redirectTo?: string;
};

export const useRoleGuard = (
  allowedRoles: UserRole[],
  { redirectTo = '/unauthorized' }: UseRoleGuardOptions = {},
) => {
  const { user, initializing, hasRole } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    if (segments[0] === '(auth)') return; // allow auth flows to proceed

    if (!user) return;

    const isAllowed = hasRole(allowedRoles);
    if (!isAllowed) {
      router.replace(redirectTo);
    }
  }, [allowedRoles, hasRole, initializing, redirectTo, router, segments, user]);
};
