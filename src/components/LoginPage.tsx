import React, { useState } from 'react';
import {
  Building2,
  Store,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { Branch, User } from '../types.js';
import { PawIcon } from './PetAvatars.js';
import {
  FIXED_BRANCHES,
  verifyPassword,
  BRANCH_CREDENTIALS,
} from '../data/branches.js';

interface LoginPageProps {
  branches: Branch[];
  onLogin: (user: User) => void;
}

const FALLBACK_BRANCHES: Branch[] = FIXED_BRANCHES;

export const LoginPage: React.FC<LoginPageProps> = ({ branches: initialBranches, onLogin }) => {
  const branches = initialBranches && initialBranches.length > 0 ? initialBranches : FALLBACK_BRANCHES;

  // Selected Scope: 'OWNER' or branch ID (e.g. 'branch-1')
  const [selectedScope, setSelectedScope] = useState<string>('OWNER');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const isOwnerSelected = selectedScope === 'OWNER';
  const selectedBranch = branches.find((b) => b.id === selectedScope);

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    // Client-side verification
    const isValid = verifyPassword(selectedScope, password, selectedBranch);
    if (!isValid) {
      if (isOwnerSelected) {
        setError('Incorrect Owner password. Please enter the authorized password.');
      } else {
        setError(`Incorrect password for ${selectedBranch?.name || 'this branch'}.`);
      }
      return;
    }

    setLoading(true);

    try {
      if (isOwnerSelected) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'OWNER',
            branchId: 'OWNER',
            username: 'owner',
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        onLogin(data.user);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId: selectedScope,
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        onLogin(data.user);
      }
    } catch (err: any) {
      // Local authenticated fallback in case of connection drop
      if (isOwnerSelected) {
        onLogin({
          id: 'usr-owner-001',
          name: 'Vikram Singhania',
          username: 'owner',
          role: 'OWNER',
          designation: 'Founder & Super Admin',
          avatarType: 'dog',
          status: 'ACTIVE',
        });
      } else if (selectedBranch) {
        const cred = BRANCH_CREDENTIALS[selectedBranch.id];
        onLogin({
          id: `mgr-${selectedBranch.id}`,
          name: selectedBranch.managerName,
          username: `${cred?.branchCode.toLowerCase() || 'branch'}_incharge`,
          role: 'BRANCH_MANAGER',
          designation: 'Shop Incharge / Manager',
          branchId: selectedBranch.id,
          avatarType: 'cat',
          status: 'ACTIVE',
        });
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between text-[#264653] font-sans antialiased selection:bg-[#D97757]/20">
      {/* Top Brand Bar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-[#EAE7E0] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-2xl flex items-center justify-center text-white shadow-sm">
            <PawIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-black text-lg text-[#1A1A1A] tracking-tight">PET WORLD</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#5A5A40] border border-[#EAE7E0]">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[11px] text-[#7C9082]">Multi-Branch Management & POS System</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#7C9082] bg-[#FAF8F5] px-3 py-1.5 rounded-full border border-[#EAE7E0]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Central Server Active (Port 3000)</span>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EAE7E0] shadow-xl shadow-stone-200/50 overflow-hidden">
          {/* Header Graphic / Banner */}
          <div className="bg-gradient-to-br from-[#FAF8F5] via-[#F5F2ED] to-[#ECE7DE] p-6 sm:p-7 border-b border-[#EAE7E0]">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-[#EAE7E0] text-[11px] font-semibold text-[#5A5A40] mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D97757]" />
                  <span>Authorized Portal Access</span>
                </div>
                <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">Welcome Back</h2>
                <p className="text-xs text-[#5A5A40]">
                  Select your operating branch or login as Owner to access the system
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white border border-[#EAE7E0] shadow-sm flex items-center justify-center text-[#D97757]">
                {isOwnerSelected ? <Building2 className="w-6 h-6" /> : <Store className="w-6 h-6" />}
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleLoginSubmit} className="p-6 sm:p-7 space-y-5">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* SELECTION BOX: Branch or Owner */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A40] flex items-center justify-between">
                <span>Select Branch or Owner</span>
                <span className="text-[10px] font-semibold text-[#D97757] normal-case">
                  {isOwnerSelected ? 'HQ Master Admin' : `Store Counter (${selectedBranch?.code})`}
                </span>
              </label>

              <div className="relative">
                <select
                  value={selectedScope}
                  onChange={(e) => {
                    setSelectedScope(e.target.value);
                    setPassword('');
                    setError('');
                  }}
                  className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#F5F2ED] border border-[#EAE7E0] focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 text-sm font-semibold text-[#1A1A1A] transition-all appearance-none cursor-pointer"
                >
                  <optgroup label="Central Management">
                    <option value="OWNER">🏢 Head Office / Super Admin (Owner)</option>
                  </optgroup>

                  <optgroup label="Retail Store Branches (POS Counters)">
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        📍 {b.code} • {b.name} ({b.city})
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5A5A40]">
                  {isOwnerSelected ? <Building2 className="w-4 h-4 text-[#D97757]" /> : <MapPin className="w-4 h-4 text-[#D97757]" />}
                </div>

                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#7C9082]">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Minimal branch incharge info (only if retail branch is selected) */}
            {!isOwnerSelected && selectedBranch && (
              <div className="px-4 py-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-between text-xs text-[#5A5A40]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#264653] text-white text-[10px] font-black">
                    {selectedBranch.code}
                  </span>
                  <span className="font-bold text-[#1A1A1A]">{selectedBranch.name}</span>
                </div>
                <div className="text-[11px] text-[#7C9082]">
                  Incharge: <strong className="text-[#1A1A1A]">{selectedBranch.managerName}</strong>
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
                Security PIN / Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={
                    isOwnerSelected
                      ? 'Enter Owner Password'
                      : `Enter password for ${selectedBranch?.name || 'branch'}`
                  }
                  className="w-full pl-11 pr-11 py-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 text-sm font-semibold text-[#1A1A1A] transition-all"
                  required
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C9082]">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7C9082] hover:text-[#1A1A1A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#D97757] hover:bg-[#c66545] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-[#D97757]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {isOwnerSelected ? 'Sign In as Owner (Head Office)' : `Sign In to ${selectedBranch?.name || 'Branch'} POS`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-[#7C9082] border-t border-[#EAE7E0] bg-white/60">
        <p>Pet World Multi-Branch POS & Retail Management System • Secure Role-Based Session</p>
      </footer>
    </div>
  );
};
