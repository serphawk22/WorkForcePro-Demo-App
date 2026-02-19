/**
 * Custom authentication hook
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, isAuthenticated, clearAuth } from '@/lib/api';

interface AuthUser {
  user_id: number;
  email: string;
  name: string;
  role: string;
}

export function useAuth(requiredRole?: 'admin' | 'employee') {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        clearAuth();
        router.push('/login');
        return;
      }

      const storedUser = getStoredUser();
      if (!storedUser) {
        clearAuth();
        router.push('/login');
        return;
      }

      // Check role-based access
      if (requiredRole && storedUser.role !== requiredRole) {
        // Redirect based on actual role
        if (storedUser.role === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/employee-dashboard');
        }
        return;
      }

      setUser(storedUser);
      setLoading(false);
    };

    checkAuth();
  }, [requiredRole, router]);

  return { user, loading, isAuthenticated: !!user };
}

export function useRequireAuth() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  return { isAuthenticated: isAuthenticated() };
}

export function useRequireAdmin() {
  return useAuth('admin');
}

export function useRequireEmployee() {
  return useAuth('employee');
}
