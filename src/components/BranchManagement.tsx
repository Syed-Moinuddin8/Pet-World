import React, { useState } from 'react';
import {
  Store,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  Edit3,
  ArrowUpRight,
  CheckCircle2,
  Receipt,
  Percent,
} from 'lucide-react';
import { Branch } from '../types.js';
import { PawIcon } from './PetAvatars.js';

interface BranchManagementProps {
  branches: Branch[];
  onUpdateBranch: (branchId: string, updates: Partial<Branch>) => Promise<any>;
  onSelectBranchPos?: (branchId: string) => void;
  onViewBranchInventory?: (branchId: string) => void;
}

export const BranchManagement: React.FC<BranchManagementProps> = ({
  branches,
  onUpdateBranch,
  onSelectBranchPos,
  onViewBranchInventory,
}) => {
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<Partial<Branch>>({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      phone: branch.phone,
      email: branch.email,
      managerName: branch.managerName,
      taxRate: branch.taxRate ?? 18,
      gstin: branch.gstin || '',
      status: branch.status,
    });
  };

  const handleSave = async (e: React.FormEvent, andOpenPos = false) => {
    e.preventDefault();
    if (!editingBranch) return;
    setLoading(true);
    try {
      await onUpdateBranch(editingBranch.id, {
        ...formData,
        taxRate: typeof formData.taxRate === 'number' ? formData.taxRate : parseFloat(String(formData.taxRate)) || 0,
        gstin: formData.gstin ? formData.gstin.trim().toUpperCase() : '',
      });
      setSuccessMsg(`Updated ${formData.name || editingBranch.name} successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      const branchId = editingBranch.id;
      setEditingBranch(null);
      if (andOpenPos && onSelectBranchPos) {
        onSelectBranchPos(branchId);
      }
    } catch (err: any) {
      alert('Error updating branch: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E76F51]/10 text-[#E76F51] text-xs font-bold mb-1">
            <PawIcon className="w-3.5 h-3.5" />
            <span>Multi-Store Network</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
            Store Branches ({branches.length} Retail Locations)
          </h1>
          <p className="text-xs text-[#7C9082]">
            Configure store identifiers, branch managers, store addresses, and contact details.
          </p>
        </div>

        {successMsg && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Grid of Branches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {branches.map((b) => (
          <div
            key={b.id}
            className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-[#EADDCE] shadow-xs hover:border-[#E76F51]/40 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Branch Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-lg bg-[#E76F51]/10 text-[#E76F51]">
                    {b.code}
                  </span>
                  <h3 className="font-bold text-base text-[#264653] mt-1.5 font-['Fredoka',sans-serif]">
                    {b.name}
                  </h3>
                </div>
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="p-2 rounded-xl bg-[#FAF1E8] hover:bg-[#F2ECE4] text-[#E76F51] transition-colors cursor-pointer"
                  title="Edit Branch Settings"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Details List */}
              <div className="mt-3.5 space-y-2 text-xs text-[#5B7065]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#7C9082] shrink-0 mt-0.5" />
                  <span className="break-words">{b.address}, {b.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#7C9082] shrink-0" />
                  <span>{b.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#7C9082] shrink-0" />
                  <span>Manager: <strong className="text-[#264653]">{b.managerName}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-5 pt-3.5 border-t border-[#EAE7E0] flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => onViewBranchInventory?.(b.id)}
                className="text-xs font-semibold text-[#5A5A40] hover:text-[#1A1A1A] underline transition-colors cursor-pointer"
              >
                View Stock
              </button>
              <button
                onClick={() => onSelectBranchPos?.(b.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D97757] hover:bg-[#C86646] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <span>Launch Counter POS</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Branch Modal */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EADDCE] shadow-2xl p-6 text-[#264653] animate-in fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2ECE4] mb-4">
              <div>
                <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-lg bg-[#E76F51]/10 text-[#E76F51]">
                  {editingBranch.code}
                </span>
                <h3 className="font-['Fredoka',sans-serif] text-lg font-bold text-[#264653] mt-1">
                  Edit Branch Details & GST
                </h3>
              </div>
              <span className="text-xs text-[#7C9082]">{editingBranch.city}</span>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-[#5B7065]">Branch Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#5B7065]">Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-[#5B7065]">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[#5B7065]">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-[#5B7065]">Branch Manager</label>
                  <input
                    type="text"
                    value={formData.managerName || ''}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[#5B7065]">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-xs"
                  />
                </div>
              </div>

              {/* Branch-Specific Taxation Section */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#E76F51]" />
                    <span className="font-bold text-xs text-[#264653]">Branch GST Identification & Tax Rate</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Individual Store Level
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-[#5B7065]">Branch GSTIN</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={formData.gstin || ''}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 27AABCP1924M1Z5"
                      className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] font-mono uppercase focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-xs"
                    />
                    <span className="text-[10px] text-[#7C9082] block mt-1">15-character GSTIN for this outlet</span>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-[#5B7065]">Branch GST Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.taxRate !== undefined ? formData.taxRate : 18}
                      onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-xs"
                    />
                    <span className="text-[10px] text-[#7C9082] block mt-1">Tax percentage applied on bills</span>
                  </div>
                </div>

                {/* GST Slab Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#7C9082] font-semibold">Common Tax Slabs:</span>
                  {[0, 5, 12, 18, 28].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFormData({ ...formData, taxRate: rate })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        formData.taxRate === rate
                          ? 'bg-[#E76F51] text-white border-[#E76F51]'
                          : 'bg-white text-[#5B7065] border-[#D5C7B8] hover:bg-[#F2ECE4]'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7C9082] hover:bg-[#F2ECE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E76F51] hover:bg-[#D95D3E] text-white shadow-xs"
                >
                  {loading ? 'Saving...' : 'Save Branch Details'}
                </button>
                {onSelectBranchPos && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={(e) => handleSave(e, true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#264653] hover:bg-[#1d353f] text-white shadow-xs flex items-center gap-1.5"
                  >
                    <span>Save & Open POS Counter</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
