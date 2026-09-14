import React, { useState } from 'react';
import {
  LayoutDashboard,
  Store,
  Boxes,
  ShoppingBag,
  GitFork,
  CircleDollarSign,
  Users,
  Clock,
  Banknote,
  FileCheck2,
  Settings,
  Calculator,
  Search,
  LogOut,
  Building2,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { User, Branch } from '../types.js';
import { PetAvatar, PawIcon } from './PetAvatars.js';

export type ActiveTab =
  | 'dashboard'
  | 'branches'
  | 'purchases'
  | 'inventory'
  | 'allocation'
  | 'sales'
  | 'staff'
  | 'attendance'
  | 'salary'
  | 'allocation-history'
  | 'settings'
  | 'pos'
  | 'branch-stock';

export type NavigationTab = ActiveTab;

interface NavigationProps {
  currentUser: User;
  activeTab: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  onSelectTab?: (tab: ActiveTab) => void;
  branches?: Branch[];
  inventory?: any[];
  products?: any[];
  onOpenSearch: () => void;
  onLogout?: () => void;
  children?: React.ReactNode;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onSelectTab,
  branches = [],
  onOpenSearch,
  onLogout,
  children,
}) => {
  const switchTab = onSelectTab || setActiveTab || (() => {});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOwner = currentUser.role === 'OWNER';
  const currentBranch = branches.find((b) => b.id === currentUser.branchId);

  const ownerNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: undefined },
    { id: 'branches', label: 'Branches', icon: Store, badge: '6' },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag, badge: undefined },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: undefined },
    { id: 'allocation', label: 'Stock Allocation', icon: GitFork, badge: 'Key' },
    { id: 'sales', label: 'Sales', icon: CircleDollarSign, badge: undefined },
    { id: 'staff', label: 'Staff', icon: Users, badge: undefined },
    { id: 'attendance', label: 'Attendance', icon: Clock, badge: undefined },
    { id: 'salary', label: 'Salary', icon: Banknote, badge: undefined },
    { id: 'allocation-history', label: 'Allocation History', icon: FileCheck2, badge: undefined },
    { id: 'settings', label: 'Settings', icon: Settings, badge: undefined },
  ];

  const staffNavItems = [
    { id: 'pos', label: 'Counter (POS)', icon: Calculator, badge: 'Active' },
    { id: 'sales', label: 'Branch Sales', icon: CircleDollarSign, badge: undefined },
  ];

  const navItems = isOwner ? ownerNavItems : staffNavItems;

  return (
    <>
      {/* TOPBAR */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#EAE7E0] px-3 sm:px-4 md:px-6 flex items-center justify-between shadow-2xs w-full max-w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-lg text-[#1A1A1A] hover:bg-[#F5F2ED] shrink-0"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" onClick={() => switchTab(isOwner ? 'dashboard' : 'pos')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white shadow-xs shrink-0">
              <PawIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-serif font-bold text-base sm:text-xl tracking-tight text-[#1A1A1A] whitespace-nowrap">
                  PET WORLD
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border border-[#5A5A40] text-[#5A5A40] whitespace-nowrap">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#666666] leading-none hidden md:block">
                Multi-Branch Management & POS
              </p>
            </div>
          </div>
        </div>

        {/* Branch Context Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F2ED] border border-[#EAE7E0] text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#5A5A40]" />
          <span className="text-[#666666]">Operating Context:</span>
          <strong className="text-[#1A1A1A] font-semibold">
            {isOwner ? 'All 6 Outlets (Super Admin)' : currentBranch ? `${currentBranch.name} (${currentBranch.code})` : 'Assigned Branch'}
          </strong>
        </div>

        {/* Actions & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick POS jump for Owner */}
          {isOwner && (
            <button
              onClick={() => switchTab('pos')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D97757] hover:bg-[#C86646] text-white text-xs font-semibold shadow-xs transition-all"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Counter POS</span>
            </button>
          )}

          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center justify-center p-2 sm:px-3.5 sm:py-1.5 rounded-full bg-[#F5F2ED] hover:bg-[#EAE7E0] text-[#5A5A40] border border-[#EAE7E0] text-xs transition-colors shrink-0"
            title="Search products, SKUs, bills, staff (Cmd+K)"
          >
            <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] rounded-md bg-white border border-[#EAE7E0] text-[#666666]">
              ⌘K
            </kbd>
          </button>

          {/* Logged in User Name & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-1.5 pr-1 sm:pr-2 py-1 rounded-full bg-[#F5F2ED] border border-[#EAE7E0] shrink-0">
            <PetAvatar type={currentUser.avatarType} size="sm" />
            <span className="text-xs font-bold text-[#1A1A1A] max-w-[80px] sm:max-w-[120px] truncate hidden md:inline-block">
              {currentUser.name}
            </span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Log Out / Switch Session"
                className="p-1 rounded-full text-[#5A5A40] hover:text-[#D97757] hover:bg-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SIDEBAR NAVIGATION (Desktop & Mobile Drawer) */}
      <div className="flex w-full min-w-0">
        <aside
          className={`fixed inset-y-0 left-0 top-0 md:top-16 z-40 w-72 sm:w-80 md:w-64 bg-white border-r border-[#EAE7E0] flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 shadow-xl md:shadow-none ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Drawer Header with Close Button */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-[#EAE7E0] bg-[#FAF8F5]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#5A5A40] rounded-full flex items-center justify-center text-white shadow-xs">
                <PawIcon className="w-4 h-4" />
              </div>
              <span className="font-serif font-bold text-base text-[#1A1A1A]">
                Pet World
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-[#666666] hover:bg-[#EAE7E0] hover:text-[#1A1A1A]"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Status Card */}
          <div className="p-4 border-b border-[#EAE7E0]">
            <div className="p-3 rounded-2xl bg-[#F5F2ED] border border-[#EAE7E0]">
              <div className="flex items-center gap-3">
                <PetAvatar type={currentUser.avatarType} size="md" />
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-[#1A1A1A] truncate">{currentUser.name}</h4>
                  <p className="text-[11px] text-[#666666] truncate">
                    {isOwner ? 'HQ • Super Administrator' : currentBranch?.name || 'Branch Staff'}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#5A5A40] text-[#5A5A40] bg-white">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#5A5A40]">
              {isOwner ? 'Main Menu' : 'Counter Operations'}
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    switchTab(item.id as ActiveTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 md:py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-[#D97757] text-white shadow-xs font-bold'
                      : 'text-[#5A5A40] hover:bg-[#F5F2ED] hover:text-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#7A8C7B]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F5F2ED] text-[#D97757] border border-[#EAE7E0]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN CONTENT WORKSPACE */}
        <div className="flex-1 md:pl-64 w-full min-w-0 flex flex-col">
          <main className="flex-1 w-full max-w-7xl 2xl:max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24 md:pb-12 min-w-0">
            {children}
          </main>
        </div>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
          />
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EAE7E0] md:hidden flex items-center justify-around px-1 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] safe-area-bottom"
      >
        {isOwner ? (
          <>
            <button
              onClick={() => switchTab('dashboard')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors min-h-[44px] ${
                activeTab === 'dashboard' ? 'text-[#D97757] font-bold' : 'text-[#7C9082] hover:text-[#264653]'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">HQ</span>
            </button>

            <button
              onClick={() => switchTab('purchases')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors min-h-[44px] ${
                activeTab === 'purchases' ? 'text-[#D97757] font-bold' : 'text-[#7C9082] hover:text-[#264653]'
              }`}
            >
              <ShoppingBag className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Purchases</span>
            </button>

            <button
              onClick={() => switchTab('pos')}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 min-h-[44px]"
            >
              <div
                className={`w-10 h-10 -mt-4 rounded-full flex items-center justify-center shadow-md transition-all ${
                  activeTab === 'pos'
                    ? 'bg-[#D97757] text-white ring-4 ring-[#FAF8F5]'
                    : 'bg-[#5A5A40] text-white hover:bg-[#4A4A32]'
                }`}
              >
                <Calculator className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] leading-tight mt-0.5 ${
                  activeTab === 'pos' ? 'text-[#D97757] font-bold' : 'text-[#7C9082]'
                }`}
              >
                POS
              </span>
            </button>

            <button
              onClick={() => switchTab('allocation')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors min-h-[44px] ${
                activeTab === 'allocation' ? 'text-[#D97757] font-bold' : 'text-[#7C9082] hover:text-[#264653]'
              }`}
            >
              <GitFork className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Dispatch</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-[#7C9082] hover:text-[#264653] transition-colors min-h-[44px]"
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Menu</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => switchTab('pos')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors min-h-[44px] ${
                activeTab === 'pos' ? 'text-[#D97757] font-bold' : 'text-[#7C9082] hover:text-[#264653]'
              }`}
            >
              <Calculator className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Counter POS</span>
            </button>

            <button
              onClick={() => switchTab('sales')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors min-h-[44px] ${
                activeTab === 'sales' ? 'text-[#D97757] font-bold' : 'text-[#7C9082] hover:text-[#264653]'
              }`}
            >
              <CircleDollarSign className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Branch Sales</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-[#7C9082] hover:text-[#264653] transition-colors min-h-[44px]"
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Menu</span>
            </button>
          </>
        )}
      </nav>
    </>
  );
};
