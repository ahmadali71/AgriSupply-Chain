import React, { useState, useEffect } from 'react';
import {
  Users, Building2, History, Activity, ShieldCheck, Database, Radio,
  Edit, FileText, CheckCircle2, XCircle, Search, Filter, RefreshCw,
  Plus, Upload, Trash2, Download, Eye, AlertTriangle, Lock, Shield,
  FileCheck, Calendar, Globe, Sparkles
} from 'lucide-react';
import { User, Tenant } from '../types';
import { api } from '../services/api';
import { DataTable, Column } from '../components/DataTable';
import { useAuth } from '../context/AuthContext';

interface AdminPageProps {
  initialTab?: 'users' | 'tenants' | 'audit' | 'health';
}

const ALL_ASSIGNABLE_TABS = [
  { id: 'dashboard', label: 'Overview Dashboard', category: 'General' },
  { id: 'driver-portal', label: 'Driver Mobile Portal & POD', category: 'Logistics' },
  { id: 'farms', label: 'Farms Management', category: 'Operations' },
  { id: 'crops', label: 'Crops & Harvests', category: 'Operations' },
  { id: 'batches', label: 'Batches & Lots', category: 'Operations' },
  { id: 'inspections', label: 'Quality Inspection', category: 'Operations' },
  { id: 'inventory', label: 'Inventory & Storage', category: 'Operations' },
  { id: 'warehouses', label: 'Warehouses & Cold Hubs', category: 'Operations' },
  { id: 'live-tracking', label: 'Live GPS Fleet Tracking', category: 'Logistics' },
  { id: 'shipments', label: 'Reefer Shipments', category: 'Logistics' },
  { id: 'routes', label: 'Route Management', category: 'Logistics' },
  { id: 'geofences', label: 'Geofencing Security', category: 'Logistics' },
  { id: 'vehicles', label: 'Fleet Vehicles', category: 'Logistics' },
  { id: 'sensors', label: 'IoT Sensors Telemetry', category: 'Cold Chain' },
  { id: 'alerts', label: 'Cold-Chain Alerts', category: 'Cold Chain' },
  { id: 'traceability', label: 'Batch Provenance Trace', category: 'Cold Chain' },
  { id: 'kanban', label: 'Kanban Supply Board', category: 'Retail' },
  { id: 'orders', label: 'Retailer Orders', category: 'Retail' },
  { id: 'deliveries', label: 'Proof of Delivery (POD)', category: 'Retail' },
  { id: 'invoices', label: 'Commercial Invoices', category: 'Finance' },
  { id: 'finance', label: 'Financial Ledger', category: 'Finance' },
  { id: 'analytics', label: 'Analytics Deck', category: 'Analytics' },
  { id: 'reports', label: 'Report Exports (PDF/CSV)', category: 'Analytics' },
  { id: 'users', label: 'Users & RBAC Duties', category: 'Administration' },
  { id: 'tenants', label: 'Multi-Tenants', category: 'Administration' },
  { id: 'audit-logs', label: 'Immutable Audit Logs', category: 'Administration' },
  { id: 'health', label: 'System Health & IoT', category: 'Administration' }
];

const ROLE_PRESETS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: ['*'],
  FARMER: ['dashboard', 'farms', 'crops', 'batches', 'inspections', 'traceability', 'orders'],
  FARM_MANAGER: ['dashboard', 'farms', 'crops', 'batches', 'inspections', 'traceability', 'inventory', 'reports'],
  QUALITY_INSPECTOR: ['dashboard', 'crops', 'batches', 'inspections', 'sensors', 'alerts', 'traceability', 'reports'],
  TRANSPORT_MANAGER: ['dashboard', 'live-tracking', 'shipments', 'routes', 'geofences', 'vehicles', 'sensors', 'alerts', 'deliveries', 'reports'],
  DRIVER: ['dashboard', 'driver-portal', 'live-tracking', 'shipments', 'deliveries'],
  WAREHOUSE_MANAGER: ['dashboard', 'inventory', 'warehouses', 'sensors', 'alerts', 'batches', 'orders', 'deliveries', 'reports'],
  RETAILER: ['dashboard', 'orders', 'deliveries', 'invoices', 'traceability', 'live-tracking'],
  FINANCE_OFFICER: ['dashboard', 'invoices', 'finance', 'orders', 'analytics', 'reports']
};

export const AdminPage: React.FC<AdminPageProps> = ({ initialTab = 'users' }) => {
  const { user: currentUser, refreshUser } = useAuth();
  const [tab, setTab] = useState<'users' | 'tenants' | 'audit' | 'health'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditMeta, setAuditMeta] = useState<any>({ totalCount: 0, uniqueActors: 0, moduleBreakdown: [] });
  const [healthData, setHealthData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User Filter State
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ONLINE' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Edit User Details & Duties Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'FARMER',
    status: 'ACTIVE',
    assigned_tabs: [] as string[]
  });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Duty Files Modal State
  const [dutyUser, setDutyUser] = useState<User | null>(null);
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadBase64, setUploadBase64] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Audit Logs Filter State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const fetchUsers = async () => {
    const res = await api.get<User[]>('/api/users');
    if (res.success && res.data) setUsers(res.data);
  };

  const fetchAuditLogs = async () => {
    let url = `/api/audit-logs?limit=150`;
    if (auditModuleFilter !== 'ALL') url += `&module=${encodeURIComponent(auditModuleFilter)}`;
    if (auditActionFilter !== 'ALL') url += `&action=${encodeURIComponent(auditActionFilter)}`;
    if (auditSearch.trim()) url += `&search=${encodeURIComponent(auditSearch.trim())}`;

    const res = await api.get<any>(url);
    if (res.success && res.data) {
      setAuditLogs(res.data);
      setAuditMeta({
        totalCount: res.totalCount || res.data.length,
        uniqueActors: res.uniqueActors || 0,
        moduleBreakdown: res.moduleBreakdown || []
      });
    }
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUsers(),
      api.get<Tenant[]>('/api/tenants').then(r => r.success && r.data && setTenants(r.data)),
      fetchAuditLogs(),
      api.get<any>('/api/health').then(r => r.status === 'UP' && setHealthData(r))
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (tab === 'audit') {
      fetchAuditLogs();
    }
  }, [auditModuleFilter, auditActionFilter, auditSearch, tab]);

  // Handle Edit User Click
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    const assigned = u.assigned_tabs && u.assigned_tabs.length > 0
      ? (u.assigned_tabs.includes('*') ? ALL_ASSIGNABLE_TABS.map(t => t.id) : u.assigned_tabs)
      : (ROLE_PRESETS[u.role] || ['dashboard']);

    setEditForm({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      status: u.status || 'ACTIVE',
      assigned_tabs: assigned
    });
    setEditSuccessMsg(null);
  };

  // Handle Save User Details & Duties
  const handleSaveUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingUser(true);
    setEditSuccessMsg(null);

    const res = await api.put<any>(`/api/users/${editingUser.id}`, editForm);
    setIsSavingUser(false);

    if (res.success) {
      setEditSuccessMsg('User details, duties, and assigned tabs updated successfully!');
      await fetchUsers();
      if (currentUser?.id === editingUser.id) {
        await refreshUser();
      }
      setTimeout(() => {
        setEditingUser(null);
      }, 1200);
    }
  };

  // Toggle Tab in Duty Matrix
  const handleToggleTab = (tabId: string) => {
    setEditForm(prev => {
      const current = prev.assigned_tabs;
      if (current.includes(tabId)) {
        return { ...prev, assigned_tabs: current.filter(id => id !== tabId) };
      } else {
        return { ...prev, assigned_tabs: [...current, tabId] };
      }
    });
  };

  const handleApplyRolePresets = (roleKey: string) => {
    const preset = ROLE_PRESETS[roleKey] || ['dashboard'];
    const tabs = preset.includes('*') ? ALL_ASSIGNABLE_TABS.map(t => t.id) : preset;
    setEditForm(prev => ({ ...prev, role: roleKey, assigned_tabs: tabs }));
  };

  const handleSelectAllTabs = () => {
    setEditForm(prev => ({ ...prev, assigned_tabs: ALL_ASSIGNABLE_TABS.map(t => t.id) }));
  };

  const handleClearAllTabs = () => {
    setEditForm(prev => ({ ...prev, assigned_tabs: ['dashboard'] }));
  };

  // Duty Files Modal Operations
  const handleOpenDutyFiles = async (u: User) => {
    setDutyUser(u);
    setIsLoadingDocs(true);
    const res = await api.get<any[]>(`/api/users/${u.id}/documents`);
    setIsLoadingDocs(false);
    if (res.success && res.data) {
      setUserDocs(res.data);
    } else {
      setUserDocs([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyUser || !uploadFileName || !uploadBase64) return;
    setIsUploadingDoc(true);
    const res = await api.post<any>(`/api/users/${dutyUser.id}/documents`, {
      file_name: uploadFileName,
      file_size: uploadBase64.length,
      mime_type: 'application/pdf',
      file_data_base64: uploadBase64
    });
    setIsUploadingDoc(false);
    if (res.success) {
      setUploadFileName('');
      setUploadBase64('');
      // Reload documents
      handleOpenDutyFiles(dutyUser);
      fetchUsers();
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!dutyUser) return;
    const res = await api.delete<any>(`/api/users/${dutyUser.id}/documents/${docId}`);
    if (res.success) {
      handleOpenDutyFiles(dutyUser);
      fetchUsers();
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    const matchesSearch = !userSearch.trim() ||
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (userStatusFilter === 'ONLINE') return u.is_online;
    if (userStatusFilter === 'ACTIVE') return u.status === 'ACTIVE';
    if (userStatusFilter === 'SUSPENDED') return u.status === 'SUSPENDED';
    return true;
  });

  const onlineCount = users.filter(u => u.is_online).length;

  const userColumns: Column<User>[] = [
    {
      key: 'full_name',
      header: 'Full Name & Identity',
      render: (u) => (
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-agri-100 dark:bg-agri-900/60 text-agri-700 dark:text-agri-300 font-bold text-xs flex items-center justify-center">
              {u.full_name?.charAt(0) || 'U'}
            </div>
            {u.is_online ? (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" title="Active Session: Online Now" />
            ) : (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-white dark:ring-slate-900" title="Offline" />
            )}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <span>{u.full_name}</span>
              {u.is_online && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  ONLINE
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">{u.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'RBAC Duty Role',
      render: (u) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
          {u.role}
        </span>
      )
    },
    {
      key: 'assigned_tabs',
      header: 'Assigned Duties (Visible Tabs)',
      render: (u) => {
        const isAdmin = u.role === 'SUPER_ADMIN' || u.role === 'TENANT_ADMIN' || u.assigned_tabs?.includes('*');
        if (isAdmin) {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              👑 All 27 Tabs Unlocked
            </span>
          );
        }
        const count = u.assigned_tabs?.length || 0;
        return (
          <div className="flex items-center space-x-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {count} Tabs Permitted
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[140px]" title={u.assigned_tabs?.join(', ')}>
              ({u.assigned_tabs?.slice(0, 2).join(', ')}{count > 2 ? '...' : ''})
            </span>
          </div>
        );
      }
    },
    {
      key: 'phone',
      header: 'Duty Files / SOPs',
      render: (u) => (
        <button
          onClick={() => handleOpenDutyFiles(u)}
          className="flex items-center space-x-1 text-xs text-agri-600 dark:text-agri-400 font-bold hover:underline"
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>{u.documents_count || 0} Files</span>
        </button>
      )
    },
    {
      key: 'last_login',
      header: 'Last Authentication',
      render: (u) => (
        <span className="text-[11px] text-slate-500 font-mono">
          {u.last_login ? new Date(u.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          u.status === 'ACTIVE'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
        }`}>
          {u.status}
        </span>
      )
    },
    {
      key: 'id',
      header: 'Actions',
      render: (u) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenEditUser(u)}
            className="px-2.5 py-1 rounded-lg bg-agri-50 dark:bg-agri-950 text-agri-700 dark:text-agri-300 hover:bg-agri-100 dark:hover:bg-agri-900 border border-agri-200 dark:border-agri-800 text-xs font-bold flex items-center space-x-1 transition-colors"
            title="Edit User Details, Role, and Assign Duties"
          >
            <Edit className="w-3 h-3" />
            <span>Edit Duties</span>
          </button>
        </div>
      )
    }
  ];

  const tenantColumns: Column<Tenant>[] = [
    {
      key: 'name',
      header: 'Organization Name',
      render: (t) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-agri-600" />
            <span>{t.name}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">Slug: {t.slug}</div>
        </div>
      )
    },
    {
      key: 'plan',
      header: 'Subscription Plan',
      render: (t) => (
        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
          {t.plan}
        </span>
      )
    },
    {
      key: 'contact_email',
      header: 'Primary Contact',
      render: (t) => <span className="text-xs text-slate-600 dark:text-slate-300">{t.contact_email}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
          {t.status}
        </span>
      )
    }
  ];

  const auditColumns: Column<any>[] = [
    {
      key: 'action',
      header: 'Action / Event',
      render: (a) => (
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${
            a.action.includes('LOGIN') ? 'bg-emerald-500' :
            a.action.includes('UPDATE') ? 'bg-sky-500' :
            a.action.includes('ALERT') ? 'bg-amber-500' :
            a.action.includes('POD') ? 'bg-purple-500' : 'bg-slate-400'
          }`} />
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
            {a.action}
          </span>
        </div>
      )
    },
    {
      key: 'module',
      header: 'Module',
      render: (a) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {a.module}
        </span>
      )
    },
    {
      key: 'user_email',
      header: 'Actor',
      render: (a) => <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">{a.user_email}</span>
    },
    {
      key: 'ip_address',
      header: 'Source IP',
      render: (a) => <span className="text-xs font-mono text-slate-400">{a.ip_address}</span>
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (a) => (
        <span className="text-[11px] font-mono text-slate-500">
          {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}
        </span>
      )
    },
    {
      key: 'id',
      header: 'Inspect Diff',
      render: (a) => (
        <button
          onClick={() => setSelectedAuditLog(a)}
          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1"
        >
          <Eye className="w-3 h-3" />
          <span>Details</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise Administration & Security</h2>
          <p className="text-xs text-slate-500">Live active sessions, role & duty tab assignments, compliance files, and immutable audit trails.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start shadow-xs">
          <button
            onClick={() => setTab('users')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              tab === 'users' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & RBAC Duties</span>
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              tab === 'audit' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail & Activity</span>
          </button>
          <button
            onClick={() => setTab('tenants')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              tab === 'tenants' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Tenants</span>
          </button>
          <button
            onClick={() => setTab('health')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              tab === 'health' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: USERS & RBAC DUTIES ===================== */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Quick Metrics & Online Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">{onlineCount} Users Online</div>
                <div className="text-[11px] text-slate-500">Live Active Sessions</div>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">{users.length} Total Users</div>
                <div className="text-[11px] text-slate-500">Registered Directory</div>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">Full RBAC</div>
                <div className="text-[11px] text-slate-500">Tab Duties Restricted</div>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">SOP Documents</div>
                <div className="text-[11px] text-slate-500">Duty File Attachments</div>
              </div>
            </div>
          </div>

          {/* User Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name, email, or role..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <button
                onClick={() => setUserStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  userStatusFilter === 'ALL' ? 'bg-agri-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setUserStatusFilter('ONLINE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                  userStatusFilter === 'ONLINE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Online Now ({onlineCount})</span>
              </button>
              <button
                onClick={fetchUsers}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Refresh users"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <DataTable
            columns={userColumns}
            data={filteredUsers}
            title="Active Organization Directory & Tab Duty Permissions"
          />
        </div>
      )}

      {/* ===================== TAB 2: AUDIT LOGS & MONITORING ===================== */}
      {tab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400">Total Tamper-Proof Audit Events</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{auditMeta.totalCount} Events</div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Cryptographically Chained</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400">Distinct Active Actors</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{auditMeta.uniqueActors} Users</div>
              <span className="text-[11px] text-slate-500">Across All Platform Modules</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400">Activity Monitoring Status</span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span>STREAM ACTIVE</span>
              </div>
              <span className="text-[11px] text-slate-500">Real-time DB Trigger Logged</span>
            </div>
          </div>

          {/* Audit Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail by actor, IP, action, or record ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="ALL">All Modules</option>
                <option value="AUTH">AUTH</option>
                <option value="USER">USER</option>
                <option value="LOGISTICS">LOGISTICS</option>
                <option value="COLD_CHAIN">COLD_CHAIN</option>
                <option value="INSPECTION">INSPECTION</option>
                <option value="FINANCE">FINANCE</option>
                <option value="DELIVERY">DELIVERY</option>
              </select>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="UPDATE_USER_DETAILS">UPDATE_USER_DETAILS</option>
                <option value="CREATE_USER">CREATE_USER</option>
                <option value="ATTACH_DUTY_FILE">ATTACH_DUTY_FILE</option>
                <option value="TEMP_ALERT">TEMP_ALERT</option>
                <option value="POD_SIGNATURE">POD_SIGNATURE</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                title="Refresh audit trail"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <DataTable
            columns={auditColumns}
            data={auditLogs}
            title="Real-Time Immutable Audit Trail & Actor Actions"
          />
        </div>
      )}

      {/* ===================== TAB 3: TENANTS ===================== */}
      {tab === 'tenants' && (
        <DataTable
          columns={tenantColumns}
          data={tenants}
          title="Multi-Tenant Organizations"
        />
      )}

      {/* ===================== TAB 4: SYSTEM HEALTH ===================== */}
      {tab === 'health' && healthData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400">Core REST API</span>
              <div className="text-xl font-bold text-emerald-600 flex items-center space-x-1.5">
                <Activity className="w-5 h-5" />
                <span>{healthData.services?.api?.status || 'UP'}</span>
              </div>
              <span className="text-[11px] text-slate-500">v{healthData.services?.api?.version || '2.0.0'}</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400">Relational Database</span>
              <div className="text-xl font-bold text-emerald-600 flex items-center space-x-1.5">
                <Database className="w-5 h-5" />
                <span>{healthData.services?.database?.status || 'UP'}</span>
              </div>
              <span className="text-[11px] text-slate-500">{healthData.services?.database?.engine || 'SQLite WAL'}</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400">Real-Time WebSocket</span>
              <div className="text-xl font-bold text-emerald-600 flex items-center space-x-1.5">
                <Radio className="w-5 h-5" />
                <span>{healthData.services?.websocket?.status || 'UP'}</span>
              </div>
              <span className="text-[11px] text-slate-500">Active Sockets: {healthData.services?.websocket?.connectedClients || 1}</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400">IoT Simulation Engine</span>
              <div className="text-xl font-bold text-emerald-600 flex items-center space-x-1.5">
                <ShieldCheck className="w-5 h-5" />
                <span>{healthData.services?.iotSimulator?.isRunning ? 'STREAMING' : 'IDLE'}</span>
              </div>
              <span className="text-[11px] text-slate-500">Tick Cycles: {healthData.services?.iotSimulator?.stepCount || 100}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 1: EDIT USER DETAILS & TAB DUTIES ===================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-agri-700 to-emerald-800 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold">Admin Duty Assignment & Profile Config</h3>
                <p className="text-xs text-emerald-100">Customize user identity, RBAC role, and explicitly assign visible tabs & duties.</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserDetails} className="p-6 space-y-5">
              {editSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              {/* Identity & Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Role & Account Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">RBAC Role Preset</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => handleApplyRolePresets(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Access)</option>
                    <option value="TENANT_ADMIN">TENANT_ADMIN (Organization Admin)</option>
                    <option value="FARMER">FARMER (Crop Producer)</option>
                    <option value="FARM_MANAGER">FARM_MANAGER (Farm Ops)</option>
                    <option value="QUALITY_INSPECTOR">QUALITY_INSPECTOR (QA & IoT)</option>
                    <option value="TRANSPORT_MANAGER">TRANSPORT_MANAGER (Logistics Fleet)</option>
                    <option value="DRIVER">DRIVER (Cold-Chain Reefer)</option>
                    <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER (Hub Storage)</option>
                    <option value="RETAILER">RETAILER (Metro Fresh)</option>
                    <option value="FINANCE_OFFICER">FINANCE_OFFICER (Commercial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized Access)</option>
                    <option value="SUSPENDED">SUSPENDED (Access Revoked)</option>
                  </select>
                </div>
              </div>

              {/* Duty Tab Permissions Matrix */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-agri-600" />
                      <span>Assigned Platform Tabs & Duties</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      When this user logs in, they will <strong>ONLY</strong> see the checked tabs below:
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTabs}
                      className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllTabs}
                      className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {ALL_ASSIGNABLE_TABS.map(tab => {
                    const isChecked = editForm.assigned_tabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        className={`flex items-start space-x-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-agri-50 dark:bg-agri-950/60 border-agri-300 dark:border-agri-800 text-agri-900 dark:text-agri-200 font-semibold'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTab(tab.id)}
                          className="mt-0.5 rounded text-agri-600 focus:ring-agri-500"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[11px]">{tab.label}</div>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block">{tab.category}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 rounded-xl bg-agri-600 hover:bg-agri-700 text-white text-xs font-bold shadow-md shadow-agri-600/20 flex items-center space-x-1.5"
                >
                  {isSavingUser ? (
                    <span>Saving Duties...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save User Duties & Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: DUTY FILES & DOCUMENTS ===================== */}
      {dutyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold flex items-center space-x-2">
                  <FileCheck className="w-5 h-5" />
                  <span>Duty & Compliance Files: {dutyUser.full_name}</span>
                </h3>
                <p className="text-xs text-blue-100">Attach and monitor SOP contracts, certificates, driver license, and job orders.</p>
              </div>
              <button
                onClick={() => setDutyUser(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Existing Documents List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Attached Compliance & Duty Documents:</span>
                {isLoadingDocs ? (
                  <div className="p-6 text-center text-xs text-slate-500">Loading documents...</div>
                ) : userDocs.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    No duty files attached yet. Upload a certificate or SOP below.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                        <div className="flex items-center space-x-2.5">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{doc.file_name}</div>
                            <div className="text-[10px] text-slate-400">
                              Size: {Math.round(doc.file_size / 1024)} KB | Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload New Document Form */}
              <form onSubmit={handleSubmitDocument} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Attach New Duty File (PDF / Image / Contract):</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100"
                />

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isUploadingDoc || !uploadFileName}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingDoc ? 'Uploading...' : 'Attach Document'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: AUDIT EVENT INSPECTION ===================== */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-agri-600" />
                  <span>Audit Event: {selectedAuditLog.action}</span>
                </h3>
                <span className="text-[11px] text-slate-400">{selectedAuditLog.timestamp}</span>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Module:</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedAuditLog.module}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Actor:</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedAuditLog.user_email}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Source IP:</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedAuditLog.ip_address}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Record Target:</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedAuditLog.record_id || 'N/A'}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Payload State & Modifications:</span>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48">
                {JSON.stringify({
                  old_values: selectedAuditLog.old_values,
                  new_values: selectedAuditLog.new_values,
                  device_info: selectedAuditLog.device_info
                }, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
