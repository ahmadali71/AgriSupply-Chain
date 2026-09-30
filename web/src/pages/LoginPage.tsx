import React, { useState } from 'react';
import {
  ThermometerSnowflake, Mail, Lock, Building2, AlertCircle,
  LogIn, User, Phone, CheckCircle2, ShieldCheck, Sprout,
  Truck, Warehouse, Store, Eye, EyeOff, Zap, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register, activeTenantId } = useAuth();

  const [activeTab, setActiveTab] = useState<'fast' | 'custom' | 'register'>('fast');

  // Sign in form state
  const [email, setEmail] = useState('admin@agrisupply.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(activeTenantId || 'tenant-greenvalley');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fastSubmittingEmail, setFastSubmittingEmail] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('FARMER');
  const [regPhone, setRegPhone] = useState('');

  const fastPersonas = [
    {
      role: 'SUPER_ADMIN',
      label: 'Super Admin',
      name: 'Arthur Vance',
      email: 'admin@agrisupply.com',
      duties: 'Full Platform & RBAC Access (All 27 Tabs)',
      badgeColor: 'border-purple-800/70 bg-purple-950/40 text-purple-300',
      icon: <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
    },
    {
      role: 'FARMER',
      label: 'Organic Farmer',
      name: 'Chen Wei',
      email: 'farmer.chen@agrisupply.com',
      duties: 'Crop Harvests, Batches, Quality & Sensors',
      badgeColor: 'border-emerald-800/70 bg-emerald-950/40 text-emerald-300',
      icon: <Sprout className="w-4 h-4 text-emerald-400 shrink-0" />
    },
    {
      role: 'DRIVER',
      label: 'Fleet Driver',
      name: 'Elena Rostova',
      email: 'elena.driver@agrisupply.com',
      duties: 'Live GPS Telemetry, Reefer Fleet & POD',
      badgeColor: 'border-sky-800/70 bg-sky-950/40 text-sky-300',
      icon: <Truck className="w-4 h-4 text-sky-400 shrink-0" />
    },
    {
      role: 'WAREHOUSE_MANAGER',
      label: 'Cold-Hub Lead',
      name: 'Marcus Vance',
      email: 'marcus.warehouse@agrisupply.com',
      duties: 'Cold Rooms, FEFO Inventory & Shipments',
      badgeColor: 'border-blue-800/70 bg-blue-950/40 text-blue-300',
      icon: <Warehouse className="w-4 h-4 text-blue-400 shrink-0" />
    },
    {
      role: 'RETAILER',
      label: 'Produce Retailer',
      name: 'FreshMarket Organic',
      email: 'retailer@freshmarket.com',
      duties: 'Commercial Orders, Invoices & FSMA Trace',
      badgeColor: 'border-amber-800/70 bg-amber-950/40 text-amber-300',
      icon: <Store className="w-4 h-4 text-amber-400 shrink-0" />
    }
  ];

  const handleFastLogin = async (personaEmail: string) => {
    setFastSubmittingEmail(personaEmail);
    setErrorMsg(null);
    const res = await login(personaEmail, 'password123', selectedTenant);
    if (!res.success) {
      setErrorMsg(res.error || 'Fast sign-in failed');
    }
    setFastSubmittingEmail(null);
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter your email and password');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    const res = await login(email, password, selectedTenant);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid email or password');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setErrorMsg('Please complete all required fields');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    const res = await register({
      full_name: regName,
      email: regEmail,
      password: regPassword,
      role: regRole,
      phone: regPhone,
      tenant_id: selectedTenant
    });
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-3 py-6 sm:px-6 relative overflow-hidden">
      {/* Subtle modern ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Container */}
      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2.5 p-2 px-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-agri-500 to-cold-500 flex items-center justify-center text-white shadow-md shadow-agri-500/20">
              <ThermometerSnowflake className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="text-base font-extrabold text-white leading-tight">AgriSupply Cloud</h1>
              <span className="text-[10px] font-semibold text-agri-400">Cold-Chain Logistics Platform</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {activeTab === 'fast' ? '⚡ 1-Tap Fast Mobile Sign In' : activeTab === 'custom' ? 'Sign In with Credentials' : 'Create an Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'fast'
                ? 'Tap any role below for instant instant 0-delay access'
                : activeTab === 'custom'
                ? 'Enter your registered email and password'
                : 'Fill in your details to join your tenant organization'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => { setActiveTab('fast'); setErrorMsg(null); }}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'fast'
                ? 'bg-agri-600 text-white shadow-md shadow-agri-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>1-Tap Fast</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('custom'); setErrorMsg(null); }}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'custom'
                ? 'bg-agri-600 text-white shadow-md shadow-agri-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Credentials</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'register'
                ? 'bg-agri-600 text-white shadow-md shadow-agri-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. FAST 1-TAP LOGIN SECTION */}
          {activeTab === 'fast' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Select Persona to Enter:</span>
                <span className="text-agri-400 font-semibold">GreenValley Agro Tenant</span>
              </div>

              <div className="space-y-2">
                {fastPersonas.map((persona) => {
                  const isLoadingThis = fastSubmittingEmail === persona.email;
                  return (
                    <button
                      key={persona.email}
                      type="button"
                      disabled={!!fastSubmittingEmail}
                      onClick={() => handleFastLogin(persona.email)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] ${persona.badgeColor} hover:brightness-125 focus:outline-none`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-950/60 flex items-center justify-center border border-white/10">
                          {persona.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                            <span>{persona.label}</span>
                            <span className="text-[10px] font-normal text-slate-400 font-sans">• {persona.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{persona.duties}</div>
                        </div>
                      </div>

                      <div className="pl-2">
                        {isLoadingThis ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 text-center border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setActiveTab('custom'); setErrorMsg(null); }}
                  className="text-xs text-slate-400 hover:text-agri-400 transition-colors"
                >
                  Or sign in with custom password →
                </button>
              </div>
            </div>
          )}

          {/* 2. CUSTOM CREDENTIALS LOGIN */}
          {activeTab === 'custom' && (
            <form onSubmit={handleManualLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Organization Tenant</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <select
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-agri-500 focus:outline-none"
                  >
                    <option value="tenant-greenvalley">GreenValley Agro Logistics</option>
                    <option value="tenant-freshdirect">FreshDirect Highlands Co.</option>
                    <option value="tenant-nordicfrost">Nordic Frost Sub-Zero</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@agrisupply.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-agri-600 hover:bg-agri-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-agri-600/30 transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Dashboard</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 3. REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. elena@agrisupply.io"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Role</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-agri-500 focus:outline-none"
                  >
                    <option value="FARMER">Farmer</option>
                    <option value="DRIVER">Driver</option>
                    <option value="QUALITY_INSPECTOR">Inspector</option>
                    <option value="WAREHOUSE_MANAGER">Warehouse</option>
                    <option value="RETAILER">Retailer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-500" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+1 555-0192"
                      className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Enterprise Account</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-500">
          AgriSupply Chain & Smart Cold-Chain Logistics • Enterprise Security
        </div>
      </div>
    </div>
  );
};
