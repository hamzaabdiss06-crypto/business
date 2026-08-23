import React, { useState } from 'react';
import { Order, StaffDriver, Tenant, OrderStatus } from '../types';
import { formatCurrency } from '../lib/mpesa';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Building2,
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  Eye,
  Filter,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
  AlertTriangle,
  Ban,
} from 'lucide-react';

interface TenantAdminDashboardProps {
  tenant: Tenant;
  orders: Order[];
  drivers: StaffDriver[];
  onSelectOrderToTrack: (order: Order) => void;
  onOpenCreateOrder: () => void;
  onOpenTenantConfig: () => void;
  onTriggerMpesa: (order: Order) => void;
}

export const TenantAdminDashboard: React.FC<TenantAdminDashboardProps> = ({
  tenant,
  orders,
  drivers,
  onSelectOrderToTrack,
  onOpenCreateOrder,
  onOpenTenantConfig,
  onTriggerMpesa,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  // Calculate stats
  const totalRevenue = orders
    .filter((o) => o.paymentInfo.status === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const activeDeliveries = orders.filter((o) =>
    ['in_progress', 'out_for_delivery'].includes(o.status)
  ).length;

  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tenant.id, orderId: orderId, updates: {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      } })
          });
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    try {
      await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tenant.id, orderId: orderId, updates: {
        driverId: driverId,
        driverName: driver?.name || 'Assigned Driver',
        driverPhone: driver?.phone || '',
        status: 'out_for_delivery',
        updatedAt: new Date().toISOString(),
      } })
          });
    } catch (err) {
      console.error('Error assigning driver:', err);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-semibold inline-flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> In Prep
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-semibold inline-flex items-center gap-1">
            <Car className="w-3.5 h-3.5" /> Out for Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Taken Down / Suspended Banner */}
      {tenant.status === 'suspended' && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 text-rose-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
              <Ban className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-rose-300 text-sm flex items-center gap-2">
                <span>BUSINESS TENANT ACCOUNT TAKEN DOWN / SUSPENDED</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/30 text-rose-200 font-mono font-bold">LIMITED ACCESS</span>
              </h4>
              <p className="text-xs text-rose-200/80 mt-0.5 leading-relaxed">
                This business account has been placed on administrative hold by the Platform Super Admin. Ordering, dispatch, and M-Pesa automated callbacks are currently disabled for this tenant.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Tenant Header & Quick Actions */}
      <div className="bg-[#1C1C1F] rounded-xl p-6 border border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">{tenant.name}</h1>
              <span className="px-2.5 py-0.5 bg-[#09090B] text-emerald-400 text-xs font-mono font-medium rounded uppercase border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ISOLATED TENANT
              </span>
            </div>
            <p className="text-sm text-[#A1A1AA] flex items-center gap-2 mt-0.5">
              <span>{tenant.category}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-xs text-[#A1A1AA]">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                {tenant.storeLocation.addressName}
              </span>
              <span>•</span>
              <span className="text-xs text-emerald-400 font-mono">
                Only {tenant.name} accounts visible
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenTenantConfig}
            className="px-4 py-2 bg-[#09090B] hover:bg-[#27272A] text-[#FAFAFA] text-xs font-medium rounded-lg border border-[#27272A] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>M-Pesa ({tenant.mpesaConfig.paybillOrTill})</span>
          </button>

          <button
            onClick={onOpenCreateOrder}
            disabled={tenant.status === 'suspended'}
            className={`px-4 py-2 text-xs font-medium rounded-lg shadow-sm flex items-center gap-2 transition-all ${
              tenant.status === 'suspended'
                ? 'bg-[#27272A] text-[#A1A1AA] cursor-not-allowed opacity-60'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
            }`}
            title={tenant.status === 'suspended' ? 'Business is suspended' : 'Create new order'}
          >
            {tenant.status === 'suspended' ? (
              <>
                <Ban className="w-4 h-4 text-rose-400" />
                <span>Orders Suspended</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create New Order</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C1C1F] rounded-xl p-5 border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Tenant Revenue</span>
            <div className="text-2xl font-semibold text-[#FAFAFA] mt-1">
              {formatCurrency(totalRevenue, tenant.currency)}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium">M-Pesa Verified</span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1C1C1F] rounded-xl p-5 border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Active Deliveries</span>
            <div className="text-2xl font-semibold text-blue-400 mt-1">{activeDeliveries}</div>
            <span className="text-[11px] text-[#A1A1AA]">Live GPS tracking</span>
          </div>
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1C1C1F] rounded-xl p-5 border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Delivered Orders</span>
            <div className="text-2xl font-semibold text-emerald-400 mt-1">{deliveredCount}</div>
            <span className="text-[11px] text-[#A1A1AA]">Completed orders</span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1C1C1F] rounded-xl p-5 border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Pending Orders</span>
            <div className="text-2xl font-semibold text-amber-400 mt-1">{pendingCount}</div>
            <span className="text-[11px] text-amber-400 font-medium">Awaiting driver</span>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Orders Management Table */}
      <div className="bg-[#1C1C1F] rounded-xl border border-[#27272A] overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-[#27272A] bg-[#09090B]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <span className="text-xs font-bold text-[#A1A1AA] uppercase flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {['all', 'pending', 'in_progress', 'out_for_delivery', 'delivered'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#1C1C1F] text-[#A1A1AA] border border-[#27272A] hover:bg-[#27272A] hover:text-[#FAFAFA]'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by order ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#09090B] border border-[#27272A] rounded-lg text-xs text-[#FAFAFA] placeholder-[#71717A] focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#09090B] border-b border-[#27272A] text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                <th className="py-3.5 px-4">Order Details</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Delivery Destination</th>
                <th className="py-3.5 px-4">M-Pesa Payment</th>
                <th className="py-3.5 px-4">Assigned Driver</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A] text-xs text-[#FAFAFA]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#71717A]">
                    <Package className="w-10 h-10 mx-auto mb-2 text-[#3F3F46]" />
                    No orders found under tenant partition.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#27272A]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-[#FAFAFA]">{order.id}</div>
                      <div className="mt-1">{getStatusBadge(order.status)}</div>
                      <div className="text-[10px] text-[#71717A] mt-1">
                        {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#FAFAFA]">{order.customerName}</div>
                      <div className="text-[#A1A1AA] font-mono text-[11px]">{order.customerPhone}</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-[#FAFAFA] line-clamp-1">{order.deliveryAddress}</div>
                      <div className="text-[10px] text-blue-400 font-mono flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {order.destinationLocation.lat.toFixed(4)}, {order.destinationLocation.lng.toFixed(4)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#FAFAFA]">
                        {formatCurrency(order.totalAmount, tenant.currency)}
                      </div>
                      <div className="mt-1">
                        {order.paymentInfo.status === 'paid' ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-mono text-[10px] font-medium border border-emerald-500/20 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> {order.paymentInfo.mpesaTransactionId}
                          </span>
                        ) : (
                          <button
                            onClick={() => onTriggerMpesa(order)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium shadow-sm transition-colors cursor-pointer"
                          >
                            Collect M-Pesa
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={order.driverId || ''}
                        onChange={(e) => handleAssignDriver(order.id, e.target.value)}
                        className="bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1 text-xs font-medium text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Unassigned</option>
                        {drivers.map((drv) => (
                          <option key={drv.id} value={drv.id} className="bg-[#1C1C1F]">
                            {drv.name} ({drv.role})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectOrderToTrack(order)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Track GPS
                        </button>
                        
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                          className="bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1 text-[11px] font-medium text-[#A1A1AA] focus:outline-none"
                        >
                          <option value="pending" className="bg-[#1C1C1F]">Set Pending</option>
                          <option value="in_progress" className="bg-[#1C1C1F]">Set In Prep</option>
                          <option value="out_for_delivery" className="bg-[#1C1C1F]">Set Out for Delivery</option>
                          <option value="delivered" className="bg-[#1C1C1F]">Set Delivered</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
