import React, { useState } from 'react';
import {
  LayoutDashboard, Sprout, Wheat, Package, ClipboardCheck,
  Warehouse, Boxes, Truck, MapPin, Radio, ShieldAlert,
  ShoppingCart, Send, FileCheck, Receipt, DollarSign,
  BarChart3, FileSpreadsheet, Users, Shield, Building2,
  Bell, History, Settings, ChevronDown, ChevronRight,
  Smartphone, ThermometerSnowflake, LogOut, Lock, Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, isOpen, onCloseMobile }) => {
  const { user, hasTabPermission, logout, setIsAuthModalOpen } = useAuth();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    OPERATIONS: true,
    LOGISTICS: true,
    COLD_CHAIN: true,
    RETAIL: true,
    FINANCE: true,
    ANALYTICS: true,
    REPORTS: true,
    ADMINISTRATION: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navItem = (id: string, label: string, icon: React.ReactNode, badge?: string) => {
    // If user lacks permission for this duty tab, do not render it
    if (!hasTabPermission(id)) return null;

    const isActive = currentView === id;
    return (
      <button
        key={id}
        onClick={() => {
          onSelectView(id);
          onCloseMobile();
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-agri-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <span className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            isActive ? 'bg-white/20 text-white' : 'bg-agri-100 dark:bg-agri-950 text-agri-700 dark:text-agri-400'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  // Check section visibility so we don't display empty headers for restricted users
  const canSeeOperations = hasTabPermission('farms') || hasTabPermission('crops') || hasTabPermission('batches') || hasTabPermission('inspections') || hasTabPermission('inventory') || hasTabPermission('warehouses');
  const canSeeLogistics = hasTabPermission('live-tracking') || hasTabPermission('shipments') || hasTabPermission('routes') || hasTabPermission('geofences') || hasTabPermission('vehicles');
  const canSeeColdChain = hasTabPermission('sensors') || hasTabPermission('alerts') || hasTabPermission('traceability');
  const canSeeRetail = hasTabPermission('kanban') || hasTabPermission('orders') || hasTabPermission('deliveries');
  const canSeeFinance = hasTabPermission('invoices') || hasTabPermission('finance');
  const canSeeAnalytics = hasTabPermission('analytics') || hasTabPermission('reports');
  const canSeeAdmin = isAdmin || hasTabPermission('users') || hasTabPermission('tenants') || hasTabPermission('audit-logs') || hasTabPermission('health');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onSelectView('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-agri-600 to-cold-600 flex items-center justify-center text-white shadow-md shadow-agri-500/20">
              <ThermometerSnowflake className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">AgriSupply</div>
              <div className="text-[10px] font-semibold tracking-wider text-agri-600 dark:text-agri-400 uppercase">Smart Cold-Chain</div>
            </div>
          </div>
          <div className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
            isAdmin 
              ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
          }`}>
            {isAdmin ? 'ADMIN' : 'DUTY'}
          </div>
        </div>

        {/* Role permission info banner */}
        {!isAdmin && (
          <div className="px-3 py-2 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Restricted Duties: Viewing assigned tabs only</span>
          </div>
        )}

        {/* Scrollable menu navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Main Dashboard */}
          <div>
            {navItem('dashboard', 'Overview Dashboard', <LayoutDashboard className="w-4 h-4" />)}
            {navItem('driver-portal', 'Driver Mobile Portal', <Smartphone className="w-4 h-4 text-emerald-500" />, 'OFFLINE')}
          </div>

          {/* Section: OPERATIONS */}
          {canSeeOperations && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('OPERATIONS')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span>Operations</span>
                {openSections.OPERATIONS ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openSections.OPERATIONS && (
                <div className="space-y-0.5 pl-1">
                  {navItem('farms', 'Farms Management', <Sprout className="w-4 h-4" />, '20+')}
                  {navItem('crops', 'Crops & Harvests', <Wheat className="w-4 h-4" />)}
                  {navItem('batches', 'Batches & Lots', <Package className="w-4 h-4" />)}
                  {navItem('inspections', 'Quality Inspection', <ClipboardCheck className="w-4 h-4" />)}
                  {navItem('inventory', 'Inventory & Storage', <Boxes className="w-4 h-4" />)}
                  {navItem('warehouses', 'Warehouses & Cold Hubs', <Warehouse className="w-4 h-4" />, '5')}
                </div>
              )}
            </div>
          )}

          {/* Section: LOGISTICS */}
          {canSeeLogistics && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('LOGISTICS')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span>Logistics & Fleet</span>
                {openSections.LOGISTICS ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openSections.LOGISTICS && (
                <div className="space-y-0.5 pl-1">
                  {navItem('live-tracking', 'Live GPS Tracking', <MapPin className="w-4 h-4 text-rose-500 animate-pulse" />, 'LIVE')}
                  {navItem('shipments', 'Reefer Shipments', <Truck className="w-4 h-4" />)}
                  {navItem('routes', 'Route Management', <Send className="w-4 h-4" />)}
                  {navItem('geofences', 'Geofencing Security', <Shield className="w-4 h-4" />)}
                  {navItem('vehicles', 'Fleet Vehicles', <Truck className="w-4 h-4" />)}
                </div>
              )}
            </div>
          )}

          {/* Section: COLD CHAIN */}
          {canSeeColdChain && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('COLD_CHAIN')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span>Smart Cold-Chain</span>
                {openSections.COLD_CHAIN ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openSections.COLD_CHAIN && (
                <div className="space-y-0.5 pl-1">
                  {navItem('sensors', 'IoT Sensors Telemetry', <Radio className="w-4 h-4" />)}
                  {navItem('alerts', 'Cold-Chain Alerts', <ShieldAlert className="w-4 h-4 text-amber-500" />)}
                  {navItem('traceability', 'Batch Provenance Trace', <History className="w-4 h-4 text-cold-500" />, 'QR')}
                </div>
              )}
            </div>
          )}

          {/* Section: RETAIL & KANBAN */}
          {canSeeRetail && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('RETAIL')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span>Retail & Pipeline</span>
                {openSections.RETAIL ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openSections.RETAIL && (
                <div className="space-y-0.5 pl-1">
                  {navItem('kanban', 'Kanban Supply Board', <Boxes className="w-4 h-4 text-indigo-500" />)}
                  {navItem('orders', 'Retailer Orders', <ShoppingCart className="w-4 h-4" />)}
                  {navItem('deliveries', 'Proof of Delivery (POD)', <FileCheck className="w-4 h-4" />)}
                </div>
              )}
            </div>
          )}

          {/* Section: FINANCE */}
          {canSeeFinance && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('FINANCE')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span>Finance & Accounts</span>
                {openSections.FINANCE ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openSections.FINANCE && (
                <div className="space-y-0.5 pl-1">
                  {navItem('invoices', 'Commercial Invoices', <Receipt className="w-4 h-4" />)}
                  {navItem('finance', 'Financial Ledger', <DollarSign className="w-4 h-4" />)}
                </div>
              )}
            </div>
          )}

          {/* Section: ANALYTICS & REPORTS */}
          {canSeeAnalytics && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('ANALYTICS')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span>Analytics & Reports</span>
                {openSections.ANALYTICS ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openSections.ANALYTICS && (
                <div className="space-y-0.5 pl-1">
                  {navItem('analytics', 'Analytics Deck', <BarChart3 className="w-4 h-4" />)}
                  {navItem('reports', 'Report Exports (PDF/CSV)', <FileSpreadsheet className="w-4 h-4" />)}
                </div>
              )}
            </div>
          )}

          {/* Section: ADMINISTRATION */}
          {canSeeAdmin && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSection('ADMINISTRATION')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span>Administration</span>
                {openSections.ADMINISTRATION ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openSections.ADMINISTRATION && (
                <div className="space-y-0.5 pl-1">
                  {navItem('users', 'Users & RBAC Duties', <Users className="w-4 h-4" />)}
                  {navItem('tenants', 'Multi-Tenants', <Building2 className="w-4 h-4" />)}
                  {navItem('audit-logs', 'Immutable Audit Logs', <History className="w-4 h-4" />)}
                  {navItem('health', 'System Health & IoT', <Settings className="w-4 h-4" />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer active user banner & Sign Out button */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-agri-100 dark:bg-agri-900/60 text-agri-700 dark:text-agri-300 flex items-center justify-center font-bold text-xs relative">
              {user?.full_name?.charAt(0) || 'U'}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.full_name || 'Guest User'}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.role?.replace('_', ' ') || 'Not Authenticated'}</div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 pt-1">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              title="Switch user account or role"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>Switch User</span>
            </button>
            <button
              onClick={logout}
              className="py-1.5 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
              title="Sign out of AgriSupply Cloud"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
