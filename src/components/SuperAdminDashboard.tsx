import React, { useState } from 'react';
import { Tenant, Order, StaffDriver } from '../types';
import { formatCurrency } from '../lib/mpesa';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Building2,
  Database,
  DollarSign,
  Layers,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
  Search,
  Ban,
  CheckCircle2,
  Power,
  X,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  MapPin,
  Check,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  tenants: Tenant[];
  onOpenCreateTenant: () => void;
  onSelectTenant: (tenant: Tenant) => void;
}

// Proposed batch tenants for confirmation
const PROPOSED_BATCH_TENANTS: Array<{
  tenant: Tenant;
  order: Order;
  driver: StaffDriver;
}> = [
  {
    tenant: {
      id: 'tenant-kisumu-organics',
      name: 'Kisumu Fresh Fish & Organics',
      slug: 'kisumu-organics',
      category: 'Organic Grocery & Fresh Produce',
      email: 'info@kisumufresh.co.ke',
      phone: '+254711223344',
      currency: 'KES',
      storeLocation: {
        lat: -0.1022,
        lng: 34.7617,
        addressName: 'Oginga Odinga Road, Kisumu CBD',
        updatedAt: new Date().toISOString(),
      },
      mpesaConfig: {
        paybillOrTill: '714900',
        accountType: 'paybill',
        consumerKey: 'kisumu_ck_live_998877665544',
        consumerSecret: 'kisumu_cs_live_112233445566',
        passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
        environment: 'sandbox',
        enabled: true,
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      orderCount: 42,
      totalRevenue: 284000,
    },
    order: {
      id: 'ORD-KO-2001',
      tenantId: 'tenant-kisumu-organics',
      status: 'out_for_delivery',
      customerId: 'cust-301',
      customerName: 'Otieno Odhiambo',
      customerPhone: '254711998877',
      deliveryAddress: 'Milimani Estate, Ring Road Kisumu',
      destinationLocation: {
        lat: -0.1150,
        lng: 34.7550,
        addressName: 'Milimani, Kisumu',
        updatedAt: new Date().toISOString(),
      },
      currentGpsLocation: {
        lat: -0.1080,
        lng: 34.7580,
        speed: 40,
        heading: 200,
        updatedAt: new Date().toISOString(),
        addressName: 'Kisumu Port Bypass',
      },
      paymentInfo: {
        mpesaTransactionId: 'QKJ112233K',
        phoneNumber: '254711998877',
        amount: 4800,
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
      items: [
        { id: 'item-k1', name: 'Fresh Lake Victoria Tilapia (Whole 3kg)', quantity: 1, unitPrice: 2800 },
        { id: 'item-k2', name: 'Organic Traditional Vegetables (Managu)', quantity: 4, unitPrice: 500 },
      ],
      totalAmount: 4800,
      driverId: 'drv-30',
      driverName: 'Calvince Ochieng',
      driverPhone: '+254711001122',
      estimatedArrivalMinutes: 10,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    driver: {
      id: 'drv-30',
      tenantId: 'tenant-kisumu-organics',
      name: 'Calvince Ochieng',
      phone: '+254711001122',
      role: 'driver',
      isOnline: true,
      currentGps: {
        lat: -0.1080,
        lng: 34.7580,
        speed: 40,
        heading: 200,
        updatedAt: new Date().toISOString(),
        addressName: 'Kisumu Port Bypass',
      },
      activeOrderId: 'ORD-KO-2001',
    },
  },
  {
    tenant: {
      id: 'tenant-rift-pharmacy',
      name: 'Rift Valley MediPharma',
      slug: 'rift-pharmacy',
      category: 'Healthcare & Pharmaceuticals',
      email: 'dispatch@riftmedipharma.co.ke',
      phone: '+254720991122',
      currency: 'KES',
      storeLocation: {
        lat: -0.2833,
        lng: 36.0667,
        addressName: 'Kenyatta Avenue, Nakuru Town',
        updatedAt: new Date().toISOString(),
      },
      mpesaConfig: {
        paybillOrTill: '247247',
        accountType: 'paybill',
        consumerKey: 'rift_ck_live_334455667788',
        consumerSecret: 'rift_cs_live_887766554433',
        passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
        environment: 'sandbox',
        enabled: true,
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      orderCount: 62,
      totalRevenue: 410000,
    },
    order: {
      id: 'ORD-RP-3001',
      tenantId: 'tenant-rift-pharmacy',
      status: 'out_for_delivery',
      customerId: 'cust-401',
      customerName: 'Dr. Elizabeth Chebet',
      customerPhone: '254720123123',
      deliveryAddress: 'Section 58, Nakuru East',
      destinationLocation: {
        lat: -0.2900,
        lng: 36.0800,
        addressName: 'Section 58, Nakuru',
        updatedAt: new Date().toISOString(),
      },
      currentGpsLocation: {
        lat: -0.2850,
        lng: 36.0720,
        speed: 45,
        heading: 120,
        updatedAt: new Date().toISOString(),
        addressName: 'Nakuru-Nairobi Highway',
      },
      paymentInfo: {
        mpesaTransactionId: 'QKH445566R',
        phoneNumber: '254720123123',
        amount: 8500,
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
      items: [
        { id: 'item-r1', name: 'First Aid Emergency Kit & Medical Supplies', quantity: 2, unitPrice: 4250 },
      ],
      totalAmount: 8500,
      driverId: 'drv-40',
      driverName: 'Kiprotich Koech',
      driverPhone: '+254722667788',
      estimatedArrivalMinutes: 7,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    driver: {
      id: 'drv-40',
      tenantId: 'tenant-rift-pharmacy',
      name: 'Kiprotich Koech',
      phone: '+254722667788',
      role: 'driver',
      isOnline: true,
      currentGps: {
        lat: -0.2850,
        lng: 36.0720,
        speed: 45,
        heading: 120,
        updatedAt: new Date().toISOString(),
        addressName: 'Nakuru-Nairobi Highway',
      },
      activeOrderId: 'ORD-RP-3001',
    },
  },
  {
    tenant: {
      id: 'tenant-mt-kenya-coffee',
      name: 'Mount Kenya Artisanal Coffee',
      slug: 'mt-kenya-coffee',
      category: 'Specialty Beverage & Roastery',
      email: 'orders@mtkenyacoffee.co.ke',
      phone: '+254700332211',
      currency: 'KES',
      storeLocation: {
        lat: -0.4167,
        lng: 36.9500,
        addressName: 'Nyeri Highway Hub, Nyeri',
        updatedAt: new Date().toISOString(),
      },
      mpesaConfig: {
        paybillOrTill: '888999',
        accountType: 'till',
        consumerKey: 'mtkenya_ck_live_556677889900',
        consumerSecret: 'mtkenya_cs_live_009988776655',
        passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
        environment: 'sandbox',
        enabled: true,
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      orderCount: 38,
      totalRevenue: 195000,
    },
    order: {
      id: 'ORD-MK-4001',
      tenantId: 'tenant-mt-kenya-coffee',
      status: 'out_for_delivery',
      customerId: 'cust-501',
      customerName: 'James Mwangi',
      customerPhone: '254700987654',
      deliveryAddress: 'Outspan Area, Nyeri',
      destinationLocation: {
        lat: -0.4250,
        lng: 36.9400,
        addressName: 'Outspan, Nyeri',
        updatedAt: new Date().toISOString(),
      },
      currentGpsLocation: {
        lat: -0.4200,
        lng: 36.9450,
        speed: 36,
        heading: 230,
        updatedAt: new Date().toISOString(),
        addressName: 'Nyeri Hill Road',
      },
      paymentInfo: {
        mpesaTransactionId: 'QKG778899M',
        phoneNumber: '254700987654',
        amount: 3200,
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
      items: [
        { id: 'item-m1', name: 'Nyeri AA Single Origin Coffee Beans (1kg)', quantity: 2, unitPrice: 1600 },
      ],
      totalAmount: 3200,
      driverId: 'drv-50',
      driverName: 'Peter Kamau',
      driverPhone: '+254700112233',
      estimatedArrivalMinutes: 9,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    driver: {
      id: 'drv-50',
      tenantId: 'tenant-mt-kenya-coffee',
      name: 'Peter Kamau',
      phone: '+254700112233',
      role: 'driver',
      isOnline: true,
      currentGps: {
        lat: -0.4200,
        lng: 36.9450,
        speed: 36,
        heading: 230,
        updatedAt: new Date().toISOString(),
        addressName: 'Nyeri Hill Road',
      },
      activeOrderId: 'ORD-MK-4001',
    },
  },
  {
    tenant: {
      id: 'tenant-eldoret-agri',
      name: 'Eldoret AgriTech & Farm Inputs',
      slug: 'eldoret-agri',
      category: 'Agricultural Machinery & Supplies',
      email: 'sales@eldoretagri.co.ke',
      phone: '+254722554411',
      currency: 'KES',
      storeLocation: {
        lat: 0.5143,
        lng: 35.2698,
        addressName: 'Uganda Road, Eldoret CBD',
        updatedAt: new Date().toISOString(),
      },
      mpesaConfig: {
        paybillOrTill: '600100',
        accountType: 'paybill',
        consumerKey: 'eldoret_ck_live_778899001122',
        consumerSecret: 'eldoret_cs_live_221100998877',
        passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
        environment: 'sandbox',
        enabled: true,
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      orderCount: 88,
      totalRevenue: 620000,
    },
    order: {
      id: 'ORD-EA-5001',
      tenantId: 'tenant-eldoret-agri',
      status: 'out_for_delivery',
      customerId: 'cust-601',
      customerName: 'Kiprono Cheruiyot',
      customerPhone: '254722554411',
      deliveryAddress: 'Kimumu Estate, Eldoret North',
      destinationLocation: {
        lat: 0.5300,
        lng: 35.2800,
        addressName: 'Kimumu, Eldoret',
        updatedAt: new Date().toISOString(),
      },
      currentGpsLocation: {
        lat: 0.5200,
        lng: 35.2750,
        speed: 48,
        heading: 45,
        updatedAt: new Date().toISOString(),
        addressName: 'Iten Highway Road',
      },
      paymentInfo: {
        mpesaTransactionId: 'QKF991122E',
        phoneNumber: '254722554411',
        amount: 24500,
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
      items: [
        { id: 'item-e1', name: 'High-Yield Certified Hybrid Seeds (50kg)', quantity: 2, unitPrice: 12250 },
      ],
      totalAmount: 24500,
      driverId: 'drv-60',
      driverName: 'Emmanuel Kibet',
      driverPhone: '+254722887766',
      estimatedArrivalMinutes: 11,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    driver: {
      id: 'drv-60',
      tenantId: 'tenant-eldoret-agri',
      name: 'Emmanuel Kibet',
      phone: '+254722887766',
      role: 'driver',
      isOnline: true,
      currentGps: {
        lat: 0.5200,
        lng: 35.2750,
        speed: 48,
        heading: 45,
        updatedAt: new Date().toISOString(),
        addressName: 'Iten Highway Road',
      },
      activeOrderId: 'ORD-EA-5001',
    },
  },
];

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  tenants,
  onOpenCreateTenant,
  onSelectTenant,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Batch Tenant Confirmation State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(
    PROPOSED_BATCH_TENANTS.map((item) => item.tenant.id)
  );
  const [isProvisioning, setIsProvisioning] = useState(false);

  const totalPlatformRevenue = tenants.reduce((sum, t) => sum + (t.totalRevenue || 0), 0);
  const totalPlatformOrders = tenants.reduce((sum, t) => sum + (t.orderCount || 0), 0);
  const activeTenantsCount = tenants.filter((t) => t.status !== 'suspended').length;
  const suspendedTenantsCount = tenants.filter((t) => t.status === 'suspended').length;

  const handleToggleBatchSelection = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBatchProvision = async () => {
    if (selectedBatchIds.length === 0) {
      alert('Please select at least one proposed business tenant to confirm.');
      return;
    }

    setIsProvisioning(true);
    try {
      const selectedItems = PROPOSED_BATCH_TENANTS.filter((item) =>
        selectedBatchIds.includes(item.tenant.id)
      );

      for (const item of selectedItems) {
        // Save Tenant doc
        const tenantRef = doc(db, 'tenants', item.tenant.id);
        await setDoc(tenantRef, item.tenant);

        // Save Order doc
        const orderRef = doc(db, 'tenants', item.tenant.id, 'orders', item.order.id);
        await setDoc(orderRef, item.order);

        // Save Driver doc
        const driverRef = doc(db, 'tenants', item.tenant.id, 'staff', item.driver.id);
        await setDoc(driverRef, item.driver);
      }

      alert(
        `SUCCESS: Provisioned and confirmed ${selectedItems.length} business tenants to Firestore!`
      );
      setIsBatchModalOpen(false);
    } catch (err) {
      console.error('Error batch provisioning tenants:', err);
      alert('Failed to provision batch tenants. Please check console for details.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const isSuspended = t.status === 'suspended';
    if (statusFilter === 'active' && isSuspended) return false;
    if (statusFilter === 'suspended' && !isSuspended) return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.id.toLowerCase().includes(term) ||
      t.category.toLowerCase().includes(term) ||
      t.email.toLowerCase().includes(term) ||
      t.phone.toLowerCase().includes(term) ||
      t.mpesaConfig.paybillOrTill.toLowerCase().includes(term)
    );
  });

  const handleToggleTenantStatus = async (tenant: Tenant) => {
    const isCurrentlySuspended = tenant.status === 'suspended';
    const actionText = isCurrentlySuspended ? 'REACTIVATE' : 'TAKE DOWN (SUSPEND)';
    const warningDetail = isCurrentlySuspended
      ? 'This will restore operations and ordering access for this business.'
      : 'This will immediately freeze ordering, payment processing, and dispatch capabilities for this business.';

    if (
      !confirm(
        `Are you sure you want to ${actionText} tenant "${tenant.name}" (${tenant.id})?\n\n${warningDetail}`
      )
    ) {
      return;
    }

    try {
      const tenantRef = doc(db, 'tenants', tenant.id);
      await updateDoc(tenantRef, {
        status: isCurrentlySuspended ? 'active' : 'suspended',
      });
    } catch (err) {
      console.error('Error updating tenant status:', err);
      alert('Failed to update tenant status in Firestore.');
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to permanently remove tenant "${tenantName}" (${tenantId}) and isolate its collections?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'tenants', tenantId));
      alert(`Tenant ${tenantName} removed successfully.`);
    } catch (err) {
      console.error('Error deleting tenant:', err);
      alert('Failed to delete tenant document.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Banner */}
      <div className="bg-[#1C1C1F] rounded-xl p-6 sm:p-8 text-[#FAFAFA] shadow-md border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> Platform Super Admin
            </span>
            <span className="px-2.5 py-0.5 bg-[#09090B] text-[#A1A1AA] border border-[#27272A] rounded text-xs font-mono font-medium">
              Multi-Tenant Governance Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FAFAFA]">Global Platform Administration</h1>
          <p className="text-[#A1A1AA] text-xs sm:text-sm mt-1">
            Real-time tenant lookup, business take-down controls, M-Pesa partition audit, and creator provisioning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Confirm Batch Tenants</span>
          </button>

          <button
            onClick={onOpenCreateTenant}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Single Tenant</span>
          </button>
        </div>
      </div>

      {/* Global Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#1C1C1F] rounded-xl p-5 border border-[#27272A] flex items-center justify-between text-[#FAFAFA]">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Total Businesses</span>
            <div className="text-2xl font-semibold text-[#FAFAFA] mt-1">{tenants.length} Tenants</div>
            <span className="text-[11px] text-emerald-400 font-medium">{activeTenantsCount} Active</span>
          </div>
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1C1C1F] rounded-xl p-5 border border-[#27272A] flex items-center justify-between text-[#FAFAFA]">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Taken Down / Suspended</span>
            <div className={`text-2xl font-semibold mt-1 ${suspendedTenantsCount > 0 ? 'text-rose-400' : 'text-[#A1A1AA]'}`}>
              {suspendedTenantsCount} Businesses
            </div>
            <span className="text-[11px] text-[#A1A1AA]">
              {suspendedTenantsCount > 0 ? 'Operations Locked' : 'No Suspensions'}
            </span>
          </div>
          <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center">
            <Ban className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1C1C1F] rounded-xl p-5 border border-[#27272A] flex items-center justify-between text-[#FAFAFA]">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Total Platform Revenue</span>
            <div className="text-2xl font-semibold text-emerald-400 mt-1">
              {formatCurrency(totalPlatformRevenue)}
            </div>
            <span className="text-[11px] text-[#A1A1AA]">Combined M-Pesa Volume</span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1C1C1F] rounded-xl p-5 border border-[#27272A] flex items-center justify-between text-[#FAFAFA]">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Total Orders</span>
            <div className="text-2xl font-semibold text-blue-400 mt-1">{totalPlatformOrders} Orders</div>
            <span className="text-[11px] text-[#A1A1AA]">Real-time Firestore Docs</span>
          </div>
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tenant Directory with Search & Take Down Controls */}
      <div className="bg-[#1C1C1F] rounded-xl p-6 border border-[#27272A] space-y-5 text-[#FAFAFA]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
          <div>
            <h3 className="text-base font-bold text-[#FAFAFA]">Tenant Directory & Governance Controls</h3>
            <p className="text-xs text-[#A1A1AA]">
              Search and manage business tenant accounts. Super Admins can take down non-compliant or suspended businesses.
            </p>
          </div>

          {/* Search Lookup & Filter Tabs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Lookup tenant, ID, Paybill..."
                className="w-full pl-9 pr-8 py-1.5 bg-[#09090B] border border-[#27272A] rounded-lg text-xs font-mono text-[#FAFAFA] focus:outline-none focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-[#A1A1AA] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#09090B] p-1 rounded-lg border border-[#27272A]">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                All ({tenants.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Active ({activeTenantsCount})
              </button>
              <button
                onClick={() => setStatusFilter('suspended')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'suspended'
                    ? 'bg-rose-600 text-white'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Taken Down ({suspendedTenantsCount})
              </button>
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        {filteredTenants.length === 0 ? (
          <div className="bg-[#09090B] rounded-xl p-10 border border-[#27272A] text-center space-y-3">
            <Search className="w-8 h-8 text-[#27272A] mx-auto" />
            <h4 className="text-sm font-semibold text-white">No Business Tenants Found</h4>
            <p className="text-xs text-[#A1A1AA]">
              No tenants match search query "{searchTerm}" or selected filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenants.map((t) => {
              const isSuspended = t.status === 'suspended';
              return (
                <div
                  key={t.id}
                  className={`bg-[#09090B] rounded-xl p-5 border transition-all space-y-3 relative overflow-hidden ${
                    isSuspended
                      ? 'border-rose-500/40 shadow-rose-950/20'
                      : 'border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  {/* Top Status Stripe */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isSuspended ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />

                  {/* Header info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded uppercase">
                          ID: {t.id}
                        </span>
                        {isSuspended ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <Ban className="w-3 h-3" /> TAKEN DOWN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-[#FAFAFA]">{t.name}</h4>
                      <p className="text-xs text-[#A1A1AA]">{t.category}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteTenant(t.id, t.name)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                      title="Permanently Delete Tenant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Details Card */}
                  <div className="border-t border-[#27272A] pt-3 space-y-1.5 text-xs text-[#A1A1AA]">
                    <div className="flex justify-between">
                      <span>M-Pesa Paybill / Till:</span>
                      <span className="font-mono font-semibold text-[#FAFAFA]">
                        {t.mpesaConfig.paybillOrTill} ({t.mpesaConfig.accountType})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contact Phone:</span>
                      <span className="font-mono text-[#FAFAFA]">{t.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Revenue:</span>
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(t.totalRevenue || 0, t.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span className="truncate max-w-[160px] text-[#FAFAFA]">
                        {t.storeLocation.addressName}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Take Down & Switch Console */}
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleToggleTenantStatus(t)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                        isSuspended
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                      title={isSuspended ? 'Reactivate this business' : 'Take down this business'}
                    >
                      {isSuspended ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reactivate</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Take Down</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onSelectTenant(t)}
                      className="py-2 px-3 bg-[#1C1C1F] hover:bg-[#27272A] text-[#FAFAFA] border border-[#27272A] rounded-lg text-xs font-medium transition-colors cursor-pointer truncate"
                    >
                      Console
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Batch Tenant Confirmation & Creator Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-[#FAFAFA] flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#FAFAFA] flex items-center gap-2">
                    Confirm & Provision Batch Business Tenants
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Review and confirm pre-configured regional business tenants to provision into Firestore.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-white rounded-lg hover:bg-[#27272A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - List of Proposed Tenants */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between text-[#A1A1AA] pb-2 border-b border-[#27272A]">
                <span>Select Businesses to Confirm ({selectedBatchIds.length} Selected)</span>
                <button
                  onClick={() =>
                    setSelectedBatchIds(
                      selectedBatchIds.length === PROPOSED_BATCH_TENANTS.length
                        ? []
                        : PROPOSED_BATCH_TENANTS.map((item) => item.tenant.id)
                    )
                  }
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>
                    {selectedBatchIds.length === PROPOSED_BATCH_TENANTS.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </button>
              </div>

              <div className="space-y-3">
                {PROPOSED_BATCH_TENANTS.map(({ tenant, order, driver }) => {
                  const isSelected = selectedBatchIds.includes(tenant.id);
                  const alreadyExists = tenants.some((t) => t.id === tenant.id);

                  return (
                    <div
                      key={tenant.id}
                      onClick={() => handleToggleBatchSelection(tenant.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#1C1C1F] border-emerald-500/50 ring-1 ring-emerald-500/30'
                          : 'bg-[#09090B] border-[#27272A] opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-[#3F3F46] bg-[#18181B]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#FAFAFA]">{tenant.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                              {tenant.category}
                            </span>
                            {alreadyExists && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                UPDATE EXISTING
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-[#A1A1AA]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#A1A1AA]" />
                              {tenant.storeLocation.addressName}
                            </span>
                            <span className="font-mono text-emerald-400">
                              M-Pesa {tenant.mpesaConfig.accountType.toUpperCase()}: {tenant.mpesaConfig.paybillOrTill}
                            </span>
                          </div>
                          <div className="mt-2 text-[10px] text-[#A1A1AA] bg-[#09090B] p-2 rounded-lg border border-[#27272A] flex items-center justify-between">
                            <span>Sample Order: <strong>{order.items[0]?.name}</strong> ({formatCurrency(order.totalAmount)})</span>
                            <span className="text-blue-400">Driver: {driver.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex items-center justify-between gap-3">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-white rounded-lg hover:bg-[#27272A]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBatchProvision}
                disabled={isProvisioning || selectedBatchIds.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isProvisioning ? (
                  <span>Provisioning to Firestore...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Provision {selectedBatchIds.length} Selected Businesses</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

