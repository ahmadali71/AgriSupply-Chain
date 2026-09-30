import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Tenant } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  activeTenantId: string;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  login: (email: string, password: string, tenantId?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; password: string; full_name: string; role: string; phone?: string; tenant_id?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: string, tenantId?: string) => Promise<void>;
  switchTenant: (tenantId: string) => void;
  hasTabPermission: (tabId: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string>(localStorage.getItem('agrisupply_tenant') || 'tenant-greenvalley');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadUser() {
      const isExplicitLoggedOut = localStorage.getItem('agrisupply_logged_out') === 'true';
      const token = localStorage.getItem('agrisupply_token');

      if (!isExplicitLoggedOut && token) {
        api.setToken(token);
        api.setTenantId(activeTenantId);
        const res = await api.get<{ user: User & { tenant: Tenant } }>('/api/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
          setTenant(res.user.tenant);
          setIsLoading(false);
          return;
        }
      }

      if (isExplicitLoggedOut) {
        setUser(null);
        setTenant(null);
        setIsAuthModalOpen(true);
        setIsLoading(false);
        return;
      }

      // Default initial login for instant presentation access
      await autoDemoLogin('SUPER_ADMIN', activeTenantId);
      setIsLoading(false);
    }
    loadUser();
  }, [activeTenantId]);

  async function autoDemoLogin(role: string, tId: string) {
    localStorage.removeItem('agrisupply_logged_out');
    const res = await api.post<any>('/api/auth/demo-login', { role, tenant_id: tId });
    if (res.success && res.accessToken) {
      api.setToken(res.accessToken);
      api.setTenantId(tId);
      setUser(res.user);
      setTenant(res.user.tenant);
      setIsAuthModalOpen(false);
    }
  }

  const login = async (email: string, password: string, tenantId?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const targetTenant = tenantId || activeTenantId;
    const res = await api.post<any>('/api/auth/login', { email, password, tenant_id: targetTenant });
    setIsLoading(false);

    if (res.success && res.accessToken) {
      localStorage.removeItem('agrisupply_logged_out');
      api.setToken(res.accessToken);
      api.setTenantId(targetTenant);
      setUser(res.user);
      setTenant(res.user.tenant);
      setIsAuthModalOpen(false);
      return { success: true };
    }
    return { success: false, error: res.error || 'Authentication failed' };
  };

  const register = async (data: { email: string; password: string; full_name: string; role: string; phone?: string; tenant_id?: string }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const targetTenant = data.tenant_id || activeTenantId;
    const res = await api.post<any>('/api/auth/register', { ...data, tenant_id: targetTenant });
    setIsLoading(false);

    if (res.success && res.accessToken) {
      localStorage.removeItem('agrisupply_logged_out');
      api.setToken(res.accessToken);
      api.setTenantId(targetTenant);
      setUser(res.user);
      setTenant(res.user.tenant);
      setIsAuthModalOpen(false);
      return { success: true };
    }
    return { success: false, error: res.error || 'Registration failed' };
  };

  const logout = async (): Promise<void> => {
    localStorage.setItem('agrisupply_logged_out', 'true');
    localStorage.removeItem('agrisupply_token');
    api.setToken(null);
    setUser(null);
    setTenant(null);
    setIsAuthModalOpen(false);

    // Non-blocking background server cleanup
    api.post('/api/auth/logout', {}).catch(() => {});
  };

  const switchRole = async (role: string, tId?: string) => {
    setIsLoading(true);
    const targetTenant = tId || activeTenantId;
    await autoDemoLogin(role, targetTenant);
    setIsLoading(false);
  };

  const switchTenant = (tId: string) => {
    setActiveTenantId(tId);
    api.setTenantId(tId);
    localStorage.setItem('agrisupply_tenant', tId);
    if (user) {
      switchRole(user.role, tId);
    }
  };

  const refreshUser = async () => {
    const res = await api.get<{ user: User & { tenant: Tenant } }>('/api/auth/me');
    if (res.success && res.user) {
      setUser(res.user);
      if (res.user.tenant) setTenant(res.user.tenant);
    }
  };

  // Determine if active user has permission to see a given navigation tab
  const hasTabPermission = (tabId: string): boolean => {
    if (!user) return false;
    // Admins have unconditional access to all tabs
    if (user.role === 'SUPER_ADMIN' || user.role === 'TENANT_ADMIN') {
      return true;
    }
    if (!user.assigned_tabs || user.assigned_tabs.length === 0) {
      return tabId === 'dashboard';
    }
    if (user.assigned_tabs.includes('*')) {
      return true;
    }
    return user.assigned_tabs.includes(tabId);
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenant,
      activeTenantId,
      isLoading,
      isAuthModalOpen,
      setIsAuthModalOpen,
      login,
      register,
      logout,
      switchRole,
      switchTenant,
      hasTabPermission,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
