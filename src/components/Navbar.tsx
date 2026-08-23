import React, { useState } from 'react';
import appLogo from '../assets/images/app_logo_1785595214602.jpg';
import { Tenant, UserRole } from '../types';
import {
  Building2,
  Car,
  ChevronDown,
  Layers,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  Plus,
  Compass,
  Zap,
  Lock,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  tenants: Tenant[];
  activeTenant: Tenant | null;
  onSelectTenant: (tenant: Tenant) => void;
  activeTab: 'tenant_admin' | 'customer_tracker' | 'driver_view' | 'super_admin';
  onChangeTab: (tab: 'tenant_admin' | 'customer_tracker' | 'driver_view' | 'super_admin') => void;
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  onOpenCreateTenant: () => void;
  onOpenCloudFunctionsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tenants,
  activeTenant,
  onSelectTenant,
  activeTab,
  onChangeTab,
  currentRole,
  onChangeRole,
  onOpenCreateTenant,
  onOpenCloudFunctionsModal,
}) => {
  const [isSwitchAccountModalOpen, setIsSwitchAccountModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#09090B] border-b border-[#1C1C1F] text-[#FAFAFA] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Platform Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#27272A] shadow-md bg-[#1C1C1F] shrink-0 flex items-center justify-center">
              <img
                src={appLogo}
                alt="OmniTrack Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight italic text-[#FAFAFA]">
                  OmniTrack
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-[11px] text-[#A1A1AA] font-medium hidden sm:block">
                GPS & M-Pesa Order Gateway
              </p>
            </div>
          </div>

          {/* Contextual Tenant Account Header Bar */}
          {activeTab === 'tenant_admin' || activeTab === 'driver_view' ? (
            /* Tenant Isolated Business Workspace Badge */
            <div className="flex-1 max-w-xs">
              <div className="flex items-center gap-2.5 bg-[#1C1C1F] border border-emerald-500/30 rounded-lg px-3 py-1.5 shadow-sm">
                <div className="p-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      Business Account
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                      Isolated
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#FAFAFA] truncate">
                    {activeTenant?.name || 'My Business Account'}
                  </div>
                </div>
                <button
                  onClick={() => setIsSwitchAccountModalOpen(true)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded border border-blue-500/20 transition-all shrink-0 cursor-pointer"
                  title="Switch business account workspace"
                >
                  Switch
                </button>
              </div>
            </div>
          ) : (
            /* Super Admin / Customer Directory Switcher */
            <div className="relative group flex-1 max-w-xs">
              <div className="flex items-center gap-2 bg-[#1C1C1F] border border-[#27272A] hover:border-blue-500/50 rounded-lg px-3 py-1.5 transition-all">
                <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">
                    {activeTab === 'super_admin' ? 'Super Admin Directory' : 'Select Merchant'}
                  </div>
                  <select
                    value={activeTenant?.id || ''}
                    onChange={(e) => {
                      const selected = tenants.find((t) => t.id === e.target.value);
                      if (selected) onSelectTenant(selected);
                    }}
                    className="w-full bg-transparent text-xs font-semibold text-[#FAFAFA] focus:outline-none cursor-pointer truncate"
                  >
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id} className="bg-[#1C1C1F] text-[#FAFAFA]">
                        {tenant.name} ({tenant.category})
                      </option>
                    ))}
                  </select>
                </div>
                <ChevronDown className="w-4 h-4 text-[#A1A1AA] shrink-0 pointer-events-none" />
              </div>
            </div>
          )}

          {/* View Mode Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#1C1C1F] p-1 rounded-lg border border-[#27272A]">
            <button
              onClick={() => onChangeTab('tenant_admin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'tenant_admin'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Tenant Admin</span>
            </button>

            <button
              onClick={() => onChangeTab('customer_tracker')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'customer_tracker'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Customer Tracker</span>
            </button>

            <button
              onClick={() => onChangeTab('driver_view')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'driver_view'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Driver View</span>
            </button>

            <button
              onClick={() => onChangeTab('super_admin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'super_admin'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Super Admin</span>
            </button>
          </nav>

          {/* Quick Role Toggle & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenCloudFunctionsModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded-md transition-all cursor-pointer active:scale-95 shadow-sm"
              title="View Firebase Cloud Functions SMS Trigger Logs"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Cloud Functions</span>
            </button>

            <button
              onClick={onOpenCreateTenant}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Tenant</span>
            </button>

            {/* Quick Role Switcher */}
            <div className="flex items-center gap-1.5 bg-[#1C1C1F] px-2.5 py-1.5 rounded-md border border-[#27272A] text-xs">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <select
                value={currentRole}
                onChange={(e) => onChangeRole(e.target.value as UserRole)}
                className="bg-transparent font-medium text-[#FAFAFA] focus:outline-none cursor-pointer"
              >
                <option value="tenant_admin" className="bg-[#1C1C1F] text-[#FAFAFA]">Role: Tenant Admin</option>
                <option value="super_admin" className="bg-[#1C1C1F] text-[#FAFAFA]">Role: Super Admin</option>
                <option value="staff_driver" className="bg-[#1C1C1F] text-[#FAFAFA]">Role: Driver / Staff</option>
                <option value="customer" className="bg-[#1C1C1F] text-[#FAFAFA]">Role: Customer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile View Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-[#1C1C1F] text-xs font-medium">
          <button
            onClick={() => onChangeTab('tenant_admin')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${activeTab === 'tenant_admin' ? 'text-blue-400 font-bold' : 'text-[#A1A1AA]'}`}
          >
            <Building2 className="w-4 h-4" />
            <span>Tenant</span>
          </button>
          <button
            onClick={() => onChangeTab('customer_tracker')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${activeTab === 'customer_tracker' ? 'text-blue-400 font-bold' : 'text-[#A1A1AA]'}`}
          >
            <MapPin className="w-4 h-4" />
            <span>Customer</span>
          </button>
          <button
            onClick={() => onChangeTab('driver_view')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${activeTab === 'driver_view' ? 'text-blue-400 font-bold' : 'text-[#A1A1AA]'}`}
          >
            <Car className="w-4 h-4" />
            <span>Driver</span>
          </button>
          <button
            onClick={() => onChangeTab('super_admin')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${activeTab === 'super_admin' ? 'text-blue-400 font-bold' : 'text-[#A1A1AA]'}`}
          >
            <Layers className="w-4 h-4" />
            <span>Platform</span>
          </button>
        </div>
      </div>

      {/* Switch Business Account Workspace Modal */}
      {isSwitchAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-[#FAFAFA] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#FAFAFA]">
                    Switch Tenant Business Account
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Select the business account you want to open and manage in your workspace.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSwitchAccountModalOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-white rounded-lg hover:bg-[#27272A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account List */}
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Tenant Data Isolation:</strong> Switching accounts isolates all orders, revenue, customer contacts, and live driver GPS tracking to the selected tenant business only.
                </span>
              </div>

              <div className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider pt-2">
                Available Tenant Business Accounts ({tenants.length})
              </div>

              <div className="space-y-2">
                {tenants.map((tenant) => {
                  const isActive = activeTenant?.id === tenant.id;
                  return (
                    <div
                      key={tenant.id}
                      onClick={() => {
                        onSelectTenant(tenant);
                        setIsSwitchAccountModalOpen(false);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/30'
                          : 'bg-[#09090B] border-[#27272A] hover:border-[#3F3F46] hover:bg-[#1C1C1F]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#18181B] text-[#A1A1AA] border border-[#27272A]'
                          }`}
                        >
                          {tenant.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#FAFAFA] truncate">
                              {tenant.name}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded">
                                ACTIVE WORKSPACE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#A1A1AA] truncate">
                            {tenant.category} • {tenant.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-[#A1A1AA]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex items-center justify-between">
              <span className="text-[11px] text-[#A1A1AA]">
                Multi-Tenant Architecture • Firestore DB Scoped
              </span>
              <button
                onClick={() => setIsSwitchAccountModalOpen(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

