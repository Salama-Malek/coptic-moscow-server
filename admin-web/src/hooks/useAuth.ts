import { useState, useCallback } from 'react';
import api from '../api/client';
import type { Admin } from '../types';

function getStoredAdmin(): Admin | null {
  try {
    const raw = localStorage.getItem('admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [admin, setAdmin] = useState<Admin | null>(getStoredAdmin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/admin/login', { email, password });
      const { token, admin: adminData } = res.data;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(adminData));
      setAdmin(adminData);
      return adminData as Admin;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdmin(null);
  }, []);

  const isAuthenticated = !!admin;
  const isSuperAdmin = admin?.role === 'super_admin';

  return { admin, login, logout, loading, error, isAuthenticated, isSuperAdmin };
}
