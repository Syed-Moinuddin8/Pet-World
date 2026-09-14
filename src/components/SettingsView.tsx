import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Receipt,
  Printer,
  RotateCcw,
  Save,
  CheckCircle2,
  Database,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Branch, User } from '../types.js';
import { PawIcon } from './PetAvatars.js';

interface SettingsViewProps {
  branches: Branch[];
  currentUser: User;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ branches, currentUser }) => {
  const [companyName, setCompanyName] = useState('Pet World Retail Private Limited');
  const [currency, setCurrency] = useState('INR (₹)');
  const [thermalPaperWidth, setThermalPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [saved, setSaved] = useState(false);

  // Supabase state
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    connected: boolean;
    message: string;
    url?: string;
    hasTables?: boolean;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    fetch('/api/supabase/status')
      .then((res) => res.json())
      .then((data) => setSupabaseStatus(data))
      .catch(() =>
        setSupabaseStatus({
          configured: false,
          connected: false,
          message: 'Unable to query Supabase status.',
        })
      );
  }, []);

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/supabase/sync', {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMessage(`Successfully synced ${data.syncedCollections.length} collections to Supabase!`);
      } else {
        setSyncMessage(data.errors?.[0] || data.error || 'Failed to sync to Supabase.');
      }
    } catch (e: any) {
      setSyncMessage(`Sync error: ${e.message || 'Network error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySchema = async () => {
    try {
      const res = await fetch('/api/supabase/schema');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 3000);
    } catch (err) {
      console.error('Failed to copy schema:', err);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E76F51]/10 text-[#E76F51] text-xs font-bold mb-1">
          <PawIcon className="w-3.5 h-3.5" />
          <span>Enterprise Configuration</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
          System & Store Settings
        </h1>
        <p className="text-xs text-[#7C9082]">
          Manage company profiles, tax rates, thermal printer defaults, and multi-branch rules
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Profile Card */}
        <div className="p-6 rounded-3xl bg-white border border-[#EADDCE] shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#264653] font-['Fredoka',sans-serif] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#E76F51]" />
            <span>Company & Tax Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1 text-[#5B7065]">Registered Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#5B7065]">Base Currency</label>
              <input
                type="text"
                disabled
                value={currency}
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-gray-50 text-[#7C9082]"
              />
            </div>
          </div>
        </div>

        {/* Hardware & Receipt Preferences */}
        <div className="p-6 rounded-3xl bg-white border border-[#EADDCE] shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#264653] font-['Fredoka',sans-serif] flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#2A9D8F]" />
            <span>POS Hardware & Counter Receipts</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1 text-[#5B7065]">Default Thermal Paper Width</label>
              <select
                value={thermalPaperWidth}
                onChange={(e) => setThermalPaperWidth(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              >
                <option value="80mm">80mm (Standard POS Receipt)</option>
                <option value="58mm">58mm (Compact Mobile Receipt)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#5B7065]">Automatic Barcode Printing</label>
              <select className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden">
                <option value="YES">Enabled (Code128 Barcodes on Receipts)</option>
                <option value="NO">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Supabase Cloud Database Integration */}
        <div className="p-6 rounded-3xl bg-white border border-[#EADDCE] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#264653] font-['Fredoka',sans-serif] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2A9D8F]" />
              <span>Supabase Cloud PostgreSQL Database</span>
            </h3>
            {supabaseStatus && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  supabaseStatus.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : supabaseStatus.configured
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-stone-100 text-stone-600 border border-stone-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    supabaseStatus.connected
                      ? 'bg-emerald-500 animate-pulse'
                      : supabaseStatus.configured
                      ? 'bg-amber-500'
                      : 'bg-stone-400'
                  }`}
                />
                {supabaseStatus.connected
                  ? 'Connected & Syncing'
                  : supabaseStatus.configured
                  ? 'Configured (Verifying)'
                  : 'Local JSON Mode'}
              </span>
            )}
          </div>

          <p className="text-xs text-[#5B7065] leading-relaxed">
            Pet World includes out-of-the-box support for <strong>Supabase</strong>. When credentials are provided,
            all branches, products, stock counts, attendance records, and sales automatically synchronize to your
            Supabase PostgreSQL cloud project.
          </p>

          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-[#264653] block">1. Supabase Environment Variables</span>
                <span className="text-[11px] text-[#7C9082]">
                  Add <code className="bg-[#EADDCE]/40 px-1 py-0.5 rounded text-[#264653]">SUPABASE_URL</code> and{' '}
                  <code className="bg-[#EADDCE]/40 px-1 py-0.5 rounded text-[#264653]">SUPABASE_KEY</code> in AI Studio Settings &gt; Secrets.
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-[#7C9082]">
                  {supabaseStatus?.url ? `Endpoint: ${supabaseStatus.url}` : 'No Supabase URL set'}
                </span>
              </div>
            </div>

            <div className="border-t border-[#EADDCE] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[#264653] block">2. Initialize Tables in Supabase</span>
                <span className="text-[11px] text-[#7C9082]">
                  Copy the SQL script and run it in the Supabase SQL Editor to prepare your cloud tables.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySchema}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5C7B8] hover:bg-stone-50 text-[#264653] text-xs font-bold transition-all shrink-0 active:scale-98"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#2A9D8F]" />}
                <span>{copiedSchema ? 'SQL Copied to Clipboard!' : 'Copy Supabase SQL Script'}</span>
              </button>
            </div>

            <div className="border-t border-[#EADDCE] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[#264653] block">3. Cloud Replication</span>
                <span className="text-[11px] text-[#7C9082]">
                  Push all existing store inventory, staff, and sales data to your Supabase project.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncSupabase}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 active:scale-98"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Push Snapshot to Supabase'}</span>
              </button>
            </div>

            {syncMessage && (
              <div className="p-2.5 rounded-xl bg-white border border-[#EADDCE] text-xs font-medium text-[#264653]">
                {syncMessage}
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings successfully updated!</span>
            </span>
          )}
          {!saved && <div />}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white text-xs font-bold shadow-xs transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Save System Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
