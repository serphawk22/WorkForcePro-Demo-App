"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  clearAuth,
  getMyProfile,
} from "@/lib/api";

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  profile_picture?: string;
  age?: number;
  date_joined?: string;
  github_url?: string;
  linkedin_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    role: "admin" | "employee"
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 1️⃣ Check localStorage on app load
  const checkAuth = useCallback(() => {
    console.log('[AUTH] Checking localStorage for existing session...');
    
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const userId = localStorage.getItem('user_id');
      const userName = localStorage.getItem('user_name');
      const userEmail = localStorage.getItem('user_email');
      
      console.log('[AUTH] Token:', token ? '✓ Present' : '✗ Missing');
      console.log('[AUTH] Role:', role || 'none');
      
      if (token && role && userId && userEmail) {
        // Restore user from localStorage
        const restoredUser: User = {
          id: parseInt(userId),
          email: userEmail,
          role: role,
          name: userName || userEmail,
        };
        
        console.log('[AUTH] Restored user from localStorage:', restoredUser.email);
        setUser(restoredUser);
      } else {
        console.log('[AUTH] No valid session in localStorage');
        setUser(null);
      }
    } catch (error) {
      console.error('[AUTH] Error checking localStorage:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('[AUTH] Initial auth check complete');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 🆕 Refresh user data from backend
  const refreshUser = useCallback(async () => {
    console.log('[AUTH] Refreshing user profile from backend...');
    
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
      console.log('[AUTH] No token, cannot refresh user');
      return;
    }
    
    try {
      const result = await getMyProfile();
      
      if (result.data) {
        console.log('[AUTH] User profile refreshed successfully:', result.data.email);
        console.log('[AUTH] Profile picture:', result.data.profile_picture ? '✓ Present' : '✗ Missing');
        
        const updatedUser: User = {
          id: result.data.id,
          email: result.data.email,
          role: result.data.role,
          name: result.data.name,
          profile_picture: result.data.profile_picture,
          age: result.data.age,
          date_joined: result.data.date_joined,
          github_url: result.data.github_url,
          linkedin_url: result.data.linkedin_url,
        };
        
        setUser(updatedUser);
        console.log('[AUTH] User state updated with new data');
      } else if (result.error) {
        console.error('[AUTH] Failed to refresh user:', result.error);
      }
    } catch (error) {
      console.error('[AUTH] Error refreshing user:', error);
    }
  }, []);

  // Fetch full user profile after initial auth check completes
  useEffect(() => {
    const fetchProfileAfterAuth = async () => {
      if (!isLoading && user) {
        console.log('[AUTH] Initial load complete, fetching full profile...');
        await refreshUser();
      }
    };
    
    fetchProfileAfterAuth();
  }, [isLoading]); // Run when loading completes

  // 2️⃣ Login function - update state BEFORE redirect
  const login = async (email: string, password: string) => {
    console.log('[AUTH] Login attempt for:', email);
    setIsLoading(true);
    
    try {
      const result = await apiLogin(email, password);

      if (result.error) {
        console.log('[AUTH] Login failed:', result.error);
        setIsLoading(false);
        return { success: false, error: result.error };
      }

      if (result.data) {
        console.log('[AUTH] Login successful - Role:', result.data.role);
        
        // Update user state IMMEDIATELY
        const newUser: User = {
          id: result.data.user_id,
          email: result.data.email,
          role: result.data.role,
          name: result.data.name,
        };
        
        setUser(newUser);
        
        // Fetch full profile with picture
        console.log('[AUTH] Fetching full user profile after login...');
        // Use setTimeout to ensure token is stored before API call
        setTimeout(async () => {
          await refreshUser();
        }, 100);
        
        setIsLoading(false);
        
        console.log('[AUTH] User state updated:', newUser);
        return { success: true, role: result.data.role };
      }
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    }
    
    setIsLoading(false);
    return { success: false, error: 'Unknown error' };
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: "admin" | "employee"
  ) => {
    const result = await apiRegister(name, email, password, role);

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  };

  const logout = async () => {
    console.log('[AUTH] Logging out...');
    await apiLogout();
    clearAuth();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        login,
        register,
        logout,
        checkAuth,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
