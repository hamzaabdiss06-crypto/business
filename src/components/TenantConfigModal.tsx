import React, { useState } from 'react';
import { Tenant } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Building2, Smartphone, X, Save, MapPin, Lock, ShieldCheck, KeyRound, UserCheck, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';

interface TenantConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTenant?: Tenant | null;
  onTenantCreated?: (tenant: Tenant) => void;
}

export const TenantConfigModal: React.FC<TenantConfigModalProps> = ({
  isOpen,
  onClose,
  existingTenant,
  onTenantCreated,
}) => {
  // Creator Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('omnitrack_creator_auth') === 'true';
  });
  const [creatorEmail, setCreatorEmail] = useState('hamzaabdiss06@gmail.com');
  const [creatorPasscode, setCreatorPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Tenant Form State
  const [name, setName] = useState(existingTenant?.name || '');
  const [category, setCategory] = useState(existingTenant?.category || 'Retail & Goods');
  const [email, setEmail] = useState(existingTenant?.email || 'admin@business.co.ke');
  const [phone, setPhone] = useState(existingTenant?.phone || '+254700112233');
  const [paybill, setPaybill] = useState(existingTenant?.mpesaConfig.paybillOrTill || '700700');
  const [accountType, setAccountType] = useState<'paybill' | 'till'>(existingTenant?.mpesaConfig.accountType || 'paybill');
  const [consumerKey, setConsumerKey] = useState(existingTenant?.mpesaConfig.consumerKey || 'daraja_ck_prod_99182391');
  const [consumerSecret, setConsumerSecret] = useState(existingTenant?.mpesaConfig.consumerSecret || 'daraja_cs_prod_88291029');
  const [passkey, setPasskey] = useState(existingTenant?.mpesaConfig.passkey || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919');
  const [storeAddress, setStoreAddress] = useState(existingTenant?.storeLocation.addressName || 'Nairobi CBD, Kenya');
  const [lat, setLat] = useState(existingTenant?.storeLocation.lat || -1.286389);
  const [lng, setLng] = useState(existingTenant?.storeLocation.lng || 36.817223);

  if (!isOpen) return null;

  const handleCreatorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = creatorPasscode.trim().toUpperCase();
    if (cleanPass === 'CREATOR2026' || cleanPass === 'ADMIN123' || creatorPasscode.trim() === 'creator2026') {
      setIsAuthenticated(true);
      localStorage.setItem('omnitrack_creator_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Access Denied: Invalid Creator Master Key. Only the authorized webapp creator can provision new tenants.');
    }
  };

  const handleLockCreatorSession = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('omnitrack_creator_auth');
    setCreatorPasscode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated && !existingTenant) {
      setAuthError('Creator Security Authentication is required to provision a new tenant.');
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tenantId = existingTenant ? existingTenant.id : `tenant-${slug}-${Date.now().toString().slice(-4)}`;

    const newTenant: Tenant = {
      id: tenantId,
      name,
      slug,
      category,
      email,
      phone,
      currency: 'KES',
      storeLocation: {
        lat: Number(lat),
        lng: Number(lng),
        addressName: storeAddress,
        updatedAt: new Date().toISOString(),
      },
      mpesaConfig: {
        paybillOrTill: paybill,
        accountType,
        consumerKey,
        consumerSecret,
        passkey,
        environment: 'sandbox',
        enabled: true,
      },
      createdAt: existingTenant?.createdAt || new Date().toISOString(),
      orderCount: existingTenant?.orderCount || 0,
      totalRevenue: existingTenant?.totalRevenue || 0,
    };

    try {
      await setDoc(doc(db, 'tenants', tenantId), newTenant);
      if (onTenantCreated) onTenantCreated(newTenant);
      onClose();
    } catch (err) {
      console.error('Error saving tenant:', err);
      alert('Failed to save tenant to Firestore.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#1C1C1F] rounded-xl shadow-2xl overflow-hidden border border-[#27272A] text-[#FAFAFA]">
        {/* Modal Header */}
        <div className="bg-[#09090B] px-6 py-5 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              {isAuthenticated ? <Building2 className="w-5 h-5" /> : <Lock className="w-5 h-5 text-amber-400 animate-pulse" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA]">
                {existingTenant
                  ? `Configure ${existingTenant.name}`
                  : !isAuthenticated
                  ? 'Creator Security Login Required'
                  : 'Provision New Business Tenant'}
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                {!isAuthenticated
                  ? 'Restricted Provisioning • Creator Verification'
                  : 'Multi-Tenant Data Partitioning Setup'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Creator Authentication Lock Screen */}
        {!isAuthenticated && !existingTenant ? (
          <form onSubmit={handleCreatorLogin} className="p-6 space-y-5 text-xs">
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 text-amber-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-amber-400 text-xs">Creator Authentication Shield Active</h4>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Only the <strong>Creator / Super Administrator</strong> of this platform can provision new business tenant accounts. Please authenticate with your Creator Master Key.
                </p>
              </div>
            </div>

            {authError && (
              <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-3 rounded-lg flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-3 bg-[#09090B] p-4 rounded-xl border border-[#27272A]">
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1 flex items-center justify-between">
                  <span>Creator Account Email</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">Webapp Owner</span>
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={creatorEmail}
                    onChange={(e) => setCreatorEmail(e.target.value)}
                    placeholder="hamzaabdiss06@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#1C1C1F] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-[#A1A1AA]">Creator Master Passcode / Security Key</label>
                  <button
                    type="button"
                    onClick={() => setCreatorPasscode('CREATOR2026')}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Auto-Fill Demo Key (CREATOR2026)
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={creatorPasscode}
                    onChange={(e) => setCreatorPasscode(e.target.value)}
                    placeholder="Enter Creator Master Passcode"
                    className="w-full pl-9 pr-3 py-2 bg-[#1C1C1F] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Creator Identity & Unlock</span>
              </button>
            </div>
          </form>
        ) : (
          /* Authenticated Creator Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
            {/* Authenticated Status Header */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorized Creator: <strong className="text-white font-mono">{creatorEmail}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleLockCreatorSession}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1 hover:underline cursor-pointer"
              >
                <LogOut className="w-3 h-3" /> Lock Session
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Safari Express Logistics"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1">Business Category</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Restaurant, Retail, Pharmacy"
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium text-[#A1A1AA] mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* M-Pesa Configuration Box */}
            <div className="bg-[#09090B] rounded-lg p-4 border border-[#27272A] space-y-3">
              <div className="flex items-center gap-2 font-semibold text-emerald-400 text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Tenant M-Pesa Credentials</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#A1A1AA] mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as 'paybill' | 'till')}
                    className="w-full px-3 py-2 bg-[#1C1C1F] border border-[#27272A] rounded-lg font-semibold text-[#FAFAFA] focus:outline-none cursor-pointer"
                  >
                    <option value="paybill">Paybill Number</option>
                    <option value="till">Buy Goods Till</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#A1A1AA] mb-1">Paybill/Till No.</label>
                  <input
                    type="text"
                    required
                    value={paybill}
                    onChange={(e) => setPaybill(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1C1C1F] border border-[#27272A] rounded-lg font-mono font-bold text-[#FAFAFA] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#A1A1AA] mb-1">Consumer Key</label>
                  <input
                    type="text"
                    value={consumerKey}
                    onChange={(e) => setConsumerKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1C1C1F] border border-[#27272A] rounded-lg font-mono text-[11px] text-[#FAFAFA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#A1A1AA] mb-1">Consumer Secret</label>
                  <input
                    type="password"
                    value={consumerSecret}
                    onChange={(e) => setConsumerSecret(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1C1C1F] border border-[#27272A] rounded-lg font-mono text-[11px] text-[#FAFAFA] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Store Location */}
            <div className="space-y-2">
              <label className="block font-medium text-[#A1A1AA]">Dispatch Hub Location</label>
              <input
                type="text"
                required
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="e.g. Sarit Centre, Westlands, Nairobi"
                className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-[#FAFAFA] focus:outline-none focus:border-blue-500"
              />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] text-[#A1A1AA] font-medium">Latitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg font-mono text-[#FAFAFA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#A1A1AA] font-medium">Longitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg font-mono text-[#FAFAFA] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Save className="w-4 h-4" />
                <span>Save Tenant Configuration</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

