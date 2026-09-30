import React, { useState } from 'react';
import {
  Menu, Bell, Moon, Sun, Wifi, WifiOff, RefreshCw,
  Building2, UserCheck, ShieldCheck, ChevronDown, LogOut,
  User, LogIn, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useOffline } from '../context/OfflineContext';

interface TopNavProps {
  onToggleSidebar: () => void;
  onOpenNotifications: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onQuickNavigate: (view: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  onOpenNotifications,
  isDarkMode,
  onToggleDarkMode,
  onQuickNavigate
}) => {
  const { user, tenant, activeTenantId, switchRole, switchTenant, logout, setIsAuthModalOpen } = useAuth();
  const { isConnected, liveAlerts } = useSocket();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, pendingCount, isSyncing, syncNow } = useOffline();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);

  const rolesList = [
    { key: 'SUPER_ADMIN', label: 'Super Admin (All Tabs)' },
    { key: 'TENANT_ADMIN', label: 'Tenant Admin' },
    { key: 'FARMER', label: 'Farmer (John)' },
    { key: 'FARM_MANAGER', label: 'Farm Manager' },
    { key: 'QUALITY_INSPECTOR', label: 'Quality Inspector (Alex)' },
    { key: 'TRANSPORT_MANAGER', label: 'Transport Manager' },
    { key: 'DRIVER', label: 'Driver (Mike - Reefer)' },
    { key: 'WAREHOUSE_MANAGER', label: 'Warehouse Manager' },
    { key: 'RETAILER', label: 'Retailer (Metro Fresh)' },
    { key: 'FINANCE_OFFICER', label: 'Finance Officer' }
  ];

  const tenantsList = [
    { id: 'tenant-greenvalley', name: 'GreenValley Agro Logistics' },
    { id: 'tenant-freshdirect', name: 'FreshDirect Highlands Co.' },
    { id: 'tenant-nordicfrost', name: 'Nordic Frost Sub-Zero' }
  ];

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tenant Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setTenantMenuOpen(!tenantMenuOpen); setRoleMenuOpen(false); }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-agri-600 dark:text-agri-400 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[130px]">{tenant?.name || 'GreenValley Agro'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {tenantMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-50">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Select Organization Tenant
              </div>
              {tenantsList.map(t => (
                <button
                  key={t.id}
                  onClick={() => { switchTenant(t.id); setTenantMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                    activeTenantId === t.id ? 'text-agri-600 dark:text-agri-400 font-bold bg-agri-50/50 dark:bg-agri-950/50' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{t.name}</span>
                  {activeTenantId === t.id && <span className="w-1.5 h-1.5 rounded-full bg-agri-600 dark:bg-agri-400"></span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live IoT WebSocket Indicator (Desktop Only) */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-slate-600 dark:text-slate-300">
            {isConnected ? 'IoT Stream Live' : 'Reconnecting IoT...'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Offline Simulator Switch */}
        <button
          onClick={toggleSimulatedOffline}
          className={`flex items-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isSimulatedOffline
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/60 shadow-xs'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
          }`}
          title="Click to toggle offline mode simulation to verify offline driver caching"
        >
          {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-bounce" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
          <span className="hidden md:inline">{isSimulatedOffline ? 'Simulated Offline' : 'Online'}</span>
        </button>

        {/* Pending Sync Badge & Manual Trigger */}
        {pendingCount > 0 && (
          <button
            onClick={syncNow}
            disabled={isSyncing}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 transition-colors animate-pulse"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{pendingCount}</span>
          </button>
        )}

        {/* Role Selector Pill */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => { setRoleMenuOpen(!roleMenuOpen); setTenantMenuOpen(false); }}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-agri-50 dark:bg-agri-950/60 border border-agri-300 dark:border-agri-800 text-xs font-bold text-agri-800 dark:text-agri-300 hover:bg-agri-100 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-agri-600 shrink-0" />
              <span className="hidden sm:inline truncate max-w-[120px]">{user.role.replace('_', ' ')}</span>
              <ChevronDown className="w-3 h-3 text-agri-600" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Quick Switch Role (Duties Test)
                </div>
                {rolesList.map(r => (
                  <button
                    key={r.key}
                    onClick={() => { switchRole(r.key); setRoleMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                      user.role === r.key ? 'text-agri-600 dark:text-agri-400 font-bold bg-agri-50/50 dark:bg-agri-950/50' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{r.label}</span>
                    {user.role === r.key && <span className="w-1.5 h-1.5 rounded-full bg-agri-600 dark:bg-agri-400"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Cold-Chain Alerts & Notifications"
        >
          <Bell className="w-4 h-4" />
          {liveAlerts.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          )}
          {liveAlerts.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
          )}
        </button>

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Explicit Sign Out Button */}
        {user && (
          <button
            onClick={logout}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
            title="Sign out of your session"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
