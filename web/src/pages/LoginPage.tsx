import React, { useState } from 'react';
import {
  ThermometerSnowflake, Mail, Lock, Building2, AlertCircle,
  LogIn, User, Phone, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register, activeTenantId } = useAuth();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign in form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(activeTenantId || 'tenant-greenvalley');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('FARMER');
  const [regPhone, setRegPhone] = useState('');

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

  // Quick fill helper (fills email & password into input fields without showing other users' files/permissions)
  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 sm:px-6 relative overflow-hidden">
      {/* Subtle modern ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10 space-y-6">
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
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'signin'
                ? 'Enter your login credentials to access the platform'
                : 'Fill in your details to register for your tenant organization'}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' ? (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Organization Tenant</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <select
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-agri-500 focus:outline-none"
                  >
                    <option value="tenant-greenvalley">GreenValley Agro Logistics</option>
                    <option value="tenant-freshdirect">FreshDirect Highlands Co.</option>
                    <option value="tenant-nordicfrost">Nordic Frost Sub-Zero</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Quick fill buttons */}
              <div className="pt-1">
                <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Demo accounts:</span>
                  <span className="text-[10px] text-slate-500">password123</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => quickFill('admin@agrisupply.com')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium border border-slate-700/60 transition-colors"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('farmer.john@greenvalley.com')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium border border-slate-700/60 transition-colors"
                  >
                    Farmer
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('driver.mike@greenvalley.com')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium border border-slate-700/60 transition-colors"
                  >
                    Driver
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('inspector.alex@greenvalley.com')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium border border-slate-700/60 transition-colors"
                  >
                    Inspector
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-agri-600 hover:bg-agri-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-agri-600/30 transition-all flex items-center justify-center space-x-2 mt-2"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(null); }}
                  className="text-xs text-agri-400 hover:underline font-medium"
                >
                  Don't have an account? Register
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
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
                    placeholder="e.g. elena@farmfresh.io"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:ring-2 focus:ring-agri-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
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
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 mt-2"
              >
                {isSubmitting ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setErrorMsg(null); }}
                  className="text-xs text-agri-400 hover:underline font-medium"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500">
          AgriSupply Chain & Smart Cold-Chain Logistics • Enterprise Security
        </div>
      </div>
    </div>
  );
};
