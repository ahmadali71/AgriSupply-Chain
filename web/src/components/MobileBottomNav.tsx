import React from 'react';
import {
  LayoutDashboard, Truck, Sprout, ShieldCheck, LogOut,
  Smartphone, Package, Boxes
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  currentView: string;
  onSelectView: (view: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onSelectView }) => {
  const { user, hasTabPermission, logout, setIsAuthModalOpen } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'TENANT_ADMIN';
  const isDriver = user.role === 'DRIVER';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {/* 1. Dashboard */}
      <button
        onClick={() => onSelectView('dashboard')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
          currentView === 'dashboard'
            ? 'text-agri-600 dark:text-agri-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Overview</span>
      </button>

      {/* 2. Primary Duty Tab */}
      {isDriver ? (
        <button
          onClick={() => onSelectView('driver-portal')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            currentView === 'driver-portal'
              ? 'text-agri-600 dark:text-agri-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Smartphone className="w-5 h-5 mb-0.5 text-emerald-500" />
          <span className="text-[10px] tracking-tight">Driver POD</span>
        </button>
      ) : hasTabPermission('live-tracking') ? (
        <button
          onClick={() => onSelectView('live-tracking')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            currentView === 'live-tracking'
              ? 'text-agri-600 dark:text-agri-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5 text-sky-500" />
          <span className="text-[10px] tracking-tight">Live Fleet</span>
        </button>
      ) : hasTabPermission('crops') ? (
        <button
          onClick={() => onSelectView('crops')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            currentView === 'crops'
              ? 'text-agri-600 dark:text-agri-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Sprout className="w-5 h-5 mb-0.5 text-emerald-500" />
          <span className="text-[10px] tracking-tight">Crops</span>
        </button>
      ) : null}

      {/* 3. Secondary Duty Tab */}
      {hasTabPermission('batches') && !isDriver ? (
        <button
          onClick={() => onSelectView('batches')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            currentView === 'batches'
              ? 'text-agri-600 dark:text-agri-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Batches</span>
        </button>
      ) : hasTabPermission('shipments') ? (
        <button
          onClick={() => onSelectView('shipments')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            currentView === 'shipments'
              ? 'text-agri-600 dark:text-agri-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Shipments</span>
        </button>
      ) : null}

      {/* 4. Admin Duties Tab */}
      {isAdmin ? (
        <button
          onClick={() => onSelectView('users')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            currentView === 'users'
              ? 'text-purple-600 dark:text-purple-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ShieldCheck className="w-5 h-5 mb-0.5 text-purple-500" />
          <span className="text-[10px] tracking-tight">Duties & RBAC</span>
        </button>
      ) : (
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-500 dark:text-slate-400"
        >
          <ShieldCheck className="w-5 h-5 mb-0.5 text-agri-600" />
          <span className="text-[10px] tracking-tight">Switch Role</span>
        </button>
      )}

      {/* 5. Mobile Sign Out */}
      <button
        onClick={logout}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-rose-500 hover:text-rose-600 active:scale-90 active:bg-rose-50 dark:active:bg-rose-950/60 transition-all cursor-pointer"
        title="Sign Out"
      >
        <LogOut className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-bold tracking-tight">Sign Out</span>
      </button>
    </nav>
  );
};
