import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { OfflineProvider } from './context/OfflineContext';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { DemoControlBar } from './components/DemoControlBar';
import { NotificationDrawer } from './components/NotificationDrawer';
import { LoginModal } from './components/LoginModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginPage } from './pages/LoginPage';
import { ShieldAlert, ArrowLeft, Key } from 'lucide-react';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { FarmsPage } from './pages/FarmsPage';
import { BatchesPage } from './pages/BatchesPage';
import { LogisticsPage } from './pages/LogisticsPage';
import { ColdChainPage } from './pages/ColdChainPage';
import { KanbanPage } from './pages/KanbanPage';
import { DriverPortalPage } from './pages/DriverPortalPage';
import { TraceabilityTimeline } from './components/TraceabilityTimeline';
import { InventoryPage } from './pages/InventoryPage';
import { FinancePage } from './pages/FinancePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminPage } from './pages/AdminPage';

const AppContent: React.FC = () => {
  const { user, isAuthModalOpen, setIsAuthModalOpen, hasTabPermission, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('agrisupply_theme') === 'dark';
  });
  const [targetTraceBatch, setTargetTraceBatch] = useState('BATCH-2026-TOM-000101');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('agrisupply_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('agrisupply_theme', 'light');
    }
  }, [isDarkMode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-agri-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-400">Loading AgriSupply Cloud...</span>
      </div>
    );
  }

  // IF USER IS SIGNED OUT OR NOT AUTHENTICATED: RENDER FULL LOGIN PAGE!
  if (!user) {
    return <LoginPage />;
  }

  const handleOpenTrace = (batchNumber: string) => {
    setTargetTraceBatch(batchNumber);
    setCurrentView('traceability');
  };

  const renderActiveView = () => {
    // RBAC tab permission check: if user cannot see this tab, show duty access banner
    if (currentView !== 'dashboard' && !hasTabPermission(currentView)) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-6 sm:p-8 glass-panel rounded-3xl border border-amber-200 dark:border-amber-900/50 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tab Duty Restricted</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            Your current assigned role (<strong>{user.role.replace('_', ' ')}</strong>) does not have access permissions for the <strong>{currentView}</strong> tab. Platform Administrators can customize tab duties in the User Management console.
          </p>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 rounded-xl bg-agri-600 text-white font-bold text-xs hover:bg-agri-700 flex items-center space-x-1.5 shadow-md shadow-agri-600/20"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Switch User Persona</span>
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentView} />;
      case 'driver-portal':
        return <DriverPortalPage />;
      case 'farms':
        return <FarmsPage />;
      case 'crops':
      case 'batches':
      case 'inspections':
        return (
          <BatchesPage
            key={currentView}
            onOpenTrace={handleOpenTrace}
            initialTab={currentView === 'crops' ? 'crops' : currentView === 'inspections' ? 'inspections' : 'batches'}
          />
        );
      case 'inventory':
      case 'warehouses':
        return (
          <InventoryPage
            key={currentView}
            initialTab={currentView === 'warehouses' ? 'warehouses' : 'inventory'}
          />
        );
      case 'live-tracking':
      case 'shipments':
      case 'vehicles':
      case 'routes':
      case 'geofences':
        return (
          <LogisticsPage
            key={currentView}
            initialTab={currentView as any}
          />
        );
      case 'sensors':
      case 'alerts':
        return (
          <ColdChainPage
            key={currentView}
            initialTab={currentView === 'alerts' ? 'alerts' : 'sensors'}
          />
        );
      case 'traceability':
        return <TraceabilityTimeline key={targetTraceBatch} initialBatchNumber={targetTraceBatch} />;
      case 'kanban':
      case 'orders':
      case 'deliveries':
        return (
          <KanbanPage
            key={currentView}
            initialTab={currentView === 'orders' ? 'orders' : currentView === 'deliveries' ? 'deliveries' : 'kanban'}
          />
        );
      case 'invoices':
      case 'finance':
        return (
          <FinancePage
            key={currentView}
            initialTab={currentView === 'invoices' ? 'invoices' : 'finance'}
          />
        );
      case 'analytics':
        return <AnalyticsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
      case 'tenants':
      case 'audit-logs':
      case 'health':
        return (
          <AdminPage
            key={currentView}
            initialTab={currentView === 'tenants' ? 'tenants' : currentView === 'audit-logs' ? 'audit' : currentView === 'health' ? 'health' : 'users'}
          />
        );
      default:
        return <DashboardPage onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Demo Simulation Bar (Desktop Only to save mobile viewport) */}
      <div className="hidden sm:block">
        <DemoControlBar
          onOpenDriverPortal={() => setCurrentView('driver-portal')}
          onRefreshData={() => {
            const old = currentView;
            setCurrentView('dashboard');
            setTimeout(() => setCurrentView(old), 50);
          }}
          onOpenTraceability={() => setCurrentView('traceability')}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <TopNav
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
            onQuickNavigate={setCurrentView}
          />

          <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* Mobile App Bottom Nav Bar */}
      <MobileBottomNav
        currentView={currentView}
        onSelectView={setCurrentView}
      />

      {/* Real-Time Notification Center Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Quick Role Switcher Modal (When authenticated) */}
      <LoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isDismissable={true}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <OfflineProvider>
          <AppContent />
        </OfflineProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
