import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  Calendar,
  Banknote,
  Edit3,
  CheckCircle2,
  X,
} from 'lucide-react';
import { StaffMember, Branch, User } from '../types.js';
import { PetAvatar, PawIcon, PetEmptyState } from './PetAvatars.js';

interface StaffManagementViewProps {
  staffList: StaffMember[];
  branches: Branch[];
  currentUser: User;
  onCreateStaff: (data: any) => Promise<any>;
  onUpdateStaff: (staffId: string, data: any) => Promise<any>;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffList,
  branches,
  currentUser,
  onCreateStaff,
  onUpdateStaff,
}) => {
  const isOwner = currentUser.role === 'OWNER';
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredStaff = staffList.filter((s) => {
    if (selectedBranch !== 'ALL' && s.branchId !== selectedBranch) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        s.branchName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateStaffSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const branchId = form.get('branchId') as string;
      const branch = branches.find((b) => b.id === branchId);
      await onCreateStaff({
        name: form.get('name') as string,
        username: form.get('username') as string,
        designation: form.get('designation') as string,
        role: form.get('role') as any,
        branchId,
        branchName: branch ? branch.name : 'Branch',
        email: form.get('email') as string,
        phone: form.get('phone') as string,
        basicSalary: Number(form.get('basicSalary')),
        avatarType: form.get('avatarType') as any,
      });
      setShowAddModal(false);
    } catch (err: any) {
      alert('Failed to add staff: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaffSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStaff) return;
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await onUpdateStaff(editingStaff.id, {
        name: form.get('name') as string,
        designation: form.get('designation') as string,
        phone: form.get('phone') as string,
        email: form.get('email') as string,
        basicSalary: Number(form.get('basicSalary')),
        status: form.get('status') as any,
      });
      setEditingStaff(null);
    } catch (err: any) {
      alert('Failed to update staff: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E76F51]/10 text-[#E76F51] text-xs font-bold mb-1">
            <PawIcon className="w-3.5 h-3.5" />
            <span>Personnel & Store Teams</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
            Staff Directory ({staffList.length} Team Members)
          </h1>
          <p className="text-xs text-[#7C9082]">
            Store managers, cashiers, groomers, and pet care specialists across all 6 locations
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Staff</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#EADDCE] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5B7065]">Store:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-semibold focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
          >
            <option value="ALL">All 6 Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#7C9082]" />
          <input
            type="text"
            placeholder="Search staff name, role, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStaff.map((staff) => (
          <div
            key={staff.id}
            className="p-4 rounded-3xl bg-white border border-[#EADDCE] shadow-xs hover:shadow-md hover:border-[#E76F51]/40 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header with Pet Avatar */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <PetAvatar type={staff.avatarType} size="md" />
                  <div>
                    <h3 className="font-bold text-xs text-[#264653] leading-snug">{staff.name}</h3>
                    <p className="text-[11px] font-semibold text-[#E76F51]">{staff.designation}</p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    staff.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {staff.status}
                </span>
              </div>

              {/* Branch Badge */}
              <div className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-xl bg-[#FAF8F5] border border-[#EADDCE] text-[10px] font-semibold text-[#5B7065]">
                <Building2 className="w-3 h-3 text-[#E76F51]" />
                <span className="truncate">{staff.branchName}</span>
              </div>

              {/* Contact Details */}
              <div className="space-y-1 text-[11px] text-[#5B7065]">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-[#7C9082]" />
                  <span>{staff.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 text-[#7C9082] shrink-0" />
                  <span className="truncate">{staff.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-[#7C9082]" />
                  <span>Joined: {staff.joiningDate}</span>
                </div>
              </div>
            </div>

            {/* Footer with Salary & Edit */}
            <div className="mt-4 pt-3 border-t border-[#F2ECE4] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#7C9082] block">Basic Pay</span>
                <span className="font-bold text-xs text-[#264653]">{formatINR(staff.basicSalary)}/mo</span>
              </div>

              {isOwner && (
                <button
                  onClick={() => setEditingStaff(staff)}
                  className="p-1.5 rounded-xl bg-[#FAF1E8] hover:bg-[#F2ECE4] text-[#E76F51] transition-colors"
                  title="Edit Staff Member"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EADDCE] shadow-2xl p-6 text-[#264653] animate-in fade-in">
            <h3 className="font-['Fredoka',sans-serif] text-base font-bold mb-3">
              Edit Staff Profile: {editingStaff.name}
            </h3>

            <form onSubmit={handleUpdateStaffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingStaff.name}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Designation</label>
                <input
                  type="text"
                  name="designation"
                  defaultValue={editingStaff.designation}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingStaff.phone}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    name="basicSalary"
                    defaultValue={editingStaff.basicSalary}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingStaff.email}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={editingStaff.status}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl font-bold bg-[#E76F51] hover:bg-[#D95D3E] text-white shadow-xs"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW STAFF MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EADDCE] shadow-2xl p-6 text-[#264653] animate-in fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-[#F2ECE4]">
              <div>
                <h3 className="font-bold text-base font-['Fredoka',sans-serif]">
                  Register New Pet Care Staff
                </h3>
                <p className="text-xs text-[#7C9082]">
                  Add personnel to one of the 6 retail branches
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#7C9082] hover:text-[#264653]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Anand Joshi"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">System Username *</label>
                  <input
                    type="text"
                    name="username"
                    required
                    placeholder="e.g. anand_b1"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Assigned Branch *</label>
                  <select
                    name="branchId"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Role *</label>
                  <select
                    name="role"
                    defaultValue="CASHIER"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  >
                    <option value="CASHIER">CASHIER (Counter Staff)</option>
                    <option value="STORE_MANAGER">STORE MANAGER</option>
                    <option value="STAFF">STAFF (Store Associate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Designation *</label>
                  <input
                    type="text"
                    name="designation"
                    required
                    placeholder="e.g. Retail Associate & Cashier"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Pet Avatar *</label>
                  <select
                    name="avatarType"
                    defaultValue="dog"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  >
                    <option value="dog">🐶 Dog</option>
                    <option value="cat">🐱 Cat</option>
                    <option value="bird">🦜 Bird</option>
                    <option value="fish">🐠 Fish</option>
                    <option value="rabbit">🐰 Rabbit</option>
                    <option value="hamster">🐹 Hamster</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    placeholder="+91 98200 12345"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    name="basicSalary"
                    required
                    placeholder="26000"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Work Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="employee@petworld.co.in"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl font-bold bg-[#E76F51] hover:bg-[#D95D3E] text-white shadow-xs"
                >
                  {loading ? 'Saving...' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
