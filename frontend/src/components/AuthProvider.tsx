"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  verifySession,
} from "@/lib/api";

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
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
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const result = await verifySession();
      if (result.data?.authenticated && result.data.user) {
        setUser(result.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await apiLogin(email, password);

    if (result.error) {
      setIsLoading(false);
      return { success: false, error: result.error };
    }

    // Set user from login response
    if (result.data) {
      setUser({
        id: result.data.user_id,
        email: email,
        role: result.data.role,
        name: result.data.name,
      });
    }
    
    setIsLoading(false);
    return { success: true, role: result.data?.role };
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
    await apiLogout();
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
