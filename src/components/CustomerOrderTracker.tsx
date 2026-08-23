import React, { useState } from 'react';
import { Order, Tenant } from '../types';
import { formatCurrency } from '../lib/mpesa';
import { OrderMap } from './OrderMap';
import {
  Car,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  MapPin,
  PackageCheck,
  Phone,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';

interface CustomerOrderTrackerProps {
  tenants: Tenant[];
  activeTenant: Tenant;
  orders: Order[];
  onTriggerMpesa: (order: Order) => void;
  selectedOrder?: Order | null;
}

export const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({
  tenants,
  activeTenant,
  orders,
  onTriggerMpesa,
  selectedOrder: initialSelectedOrder,
}) => {
  const [searchId, setSearchId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialSelectedOrder?.id || orders[0]?.id || null
  );

  // Always derive currentOrder live from real-time orders collection
  const currentOrder =
    orders.find((o) => o.id === selectedOrderId) ||
    (initialSelectedOrder ? orders.find((o) => o.id === initialSelectedOrder.id) : null) ||
    orders[0] ||
    null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    const found = orders.find(
      (o) =>
        o.id.toLowerCase() === searchId.trim().toLowerCase() ||
        o.customerPhone.includes(searchId.trim())
    );
    if (found) {
      setSelectedOrderId(found.id);
    } else {
      alert(`No order found matching "${searchId}". Try picking one of the demo order chips below!`);
    }
  };

  // Find tenant for current order
  const orderTenant = tenants.find((t) => t.id === currentOrder?.tenantId) || activeTenant;

  const getStepState = (targetStep: 'placed' | 'prep' | 'transit' | 'delivered') => {
    if (!currentOrder) return 'incomplete';
    const status = currentOrder.status;
    if (status === 'delivered') return 'completed';

    if (targetStep === 'placed') return 'completed';
    if (targetStep === 'prep') {
      return ['in_progress', 'out_for_delivery', 'delivered'].includes(status)
        ? 'completed'
        : 'current';
    }
    if (targetStep === 'transit') {
      return status === 'out_for_delivery'
        ? 'current'
        : status === 'delivered'
        ? 'completed'
        : 'incomplete';
    }
    return status === 'delivered' ? 'completed' : 'incomplete';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Search Header Banner */}
      <div className="bg-[#1C1C1F] rounded-xl p-6 sm:p-8 text-[#FAFAFA] shadow-md border border-[#27272A]">
        <div className="max-w-2xl">
          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Live Customer Tracking Portal
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Track Your Order Real-Time
          </h2>
          <p className="text-[#A1A1AA] text-xs sm:text-sm mt-1">
            Live GPS courier mapping, status timeline, and instant M-Pesa payment integration.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter Order ID (e.g. ORD-SE-1001) or Phone Number..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#09090B] border border-[#27272A] rounded-lg text-sm font-mono text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
            />
            <Search className="w-5 h-5 text-[#71717A] absolute left-3.5 top-3.5" />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Search Order</span>
          </button>
        </form>

        {/* Demo Order Selector Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#A1A1AA] font-medium mr-1">Demo Orders:</span>
          {orders.map((ord) => (
            <button
              key={ord.id}
              onClick={() => setSelectedOrderId(ord.id)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                currentOrder?.id === ord.id
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'bg-[#09090B] hover:bg-[#27272A] text-[#A1A1AA] border border-[#27272A]'
              }`}
            >
              {ord.id} ({ord.customerName.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {currentOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Status Stepper + Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Stepper Box */}
            <div className="bg-[#1C1C1F] rounded-xl p-6 shadow-sm border border-[#27272A]">
              <div className="flex items-center justify-between pb-4 border-b border-[#27272A] mb-6">
                <div>
                  <span className="text-xs text-[#A1A1AA] font-semibold uppercase tracking-wider">Order Status</span>
                  <div className="text-xl font-bold text-[#FAFAFA] flex items-center gap-2">
                    <span>Order #{currentOrder.id}</span>
                    <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                      {orderTenant.name}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#71717A]">Estimated Arrival</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {currentOrder.status === 'delivered'
                      ? 'Delivered'
                      : `~ ${currentOrder.estimatedArrivalMinutes || 15} mins`}
                  </div>
                </div>
              </div>

              {/* Progress Stepper Bar */}
              <div className="grid grid-cols-4 gap-2 relative">
                {/* Step 1 */}
                <div className="text-center space-y-2">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-[#FAFAFA]">Order Placed</div>
                  <div className="text-[10px] text-[#A1A1AA]">Confirmed</div>
                </div>

                {/* Step 2 */}
                <div className="text-center space-y-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto font-bold transition-all ${
                      ['in_progress', 'out_for_delivery', 'delivered'].includes(currentOrder.status)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#09090B] text-[#71717A] border border-[#27272A]'
                    }`}
                  >
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-[#FAFAFA]">In Prep</div>
                  <div className="text-[10px] text-[#A1A1AA]">Kitchen / Dispatch</div>
                </div>

                {/* Step 3 */}
                <div className="text-center space-y-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto font-bold transition-all ${
                      ['out_for_delivery', 'delivered'].includes(currentOrder.status)
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/50 animate-pulse'
                        : 'bg-[#09090B] text-[#71717A] border border-[#27272A]'
                    }`}
                  >
                    <Car className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-[#FAFAFA]">Out for Delivery</div>
                  <div className="text-[10px] text-[#A1A1AA]">Live GPS Tracking</div>
                </div>

                {/* Step 4 */}
                <div className="text-center space-y-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto font-bold transition-all ${
                      currentOrder.status === 'delivered'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-[#09090B] text-[#71717A] border border-[#27272A]'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-[#FAFAFA]">Delivered</div>
                  <div className="text-[10px] text-[#A1A1AA] font-mono">Completed</div>
                </div>
              </div>
            </div>

            {/* Live Interactive Leaflet GPS Map */}
            <div className="bg-[#1C1C1F] rounded-xl p-6 shadow-sm border border-[#27272A] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-[#FAFAFA]">Live Driver GPS Map</h3>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Update
                </span>
              </div>

              <OrderMap
                storeLocation={orderTenant.storeLocation}
                driverLocation={currentOrder.currentGpsLocation}
                destinationLocation={currentOrder.destinationLocation}
                driverName={currentOrder.driverName || 'Courier Driver'}
                customerName={currentOrder.customerName}
                storeName={orderTenant.name}
                status={currentOrder.status}
                estimatedArrivalMinutes={currentOrder.estimatedArrivalMinutes || 12}
              />

              {/* Driver Telemetry Bar */}
              <div className="bg-[#09090B] rounded-lg p-3.5 border border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#FAFAFA]">
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>Courier: <strong className="text-white">{currentOrder.driverName || 'Assigned Driver'}</strong></span>
                </div>
                <div className="flex items-center gap-4 text-[#A1A1AA]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Gauge className="w-4 h-4" />
                    <span>Speed: {currentOrder.currentGpsLocation?.speed || 0} km/h</span>
                  </div>
                  <div>
                    ETA: <strong className="text-emerald-400">{currentOrder.status === 'delivered' ? 'Arrived' : `~${currentOrder.estimatedArrivalMinutes || 15} min`}</strong>
                  </div>
                </div>
              </div>

              {/* Firebase Cloud Function SMS Delivery Alert Banner */}
              {(currentOrder.status === 'delivered' || currentOrder.smsNotificationSent) && (
                <div className="bg-[#09090B] rounded-lg p-4 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>Firebase Cloud Function SMS Trigger</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      SENT TO CUSTOMER
                    </span>
                  </div>
                  <div className="text-xs font-mono text-emerald-300 bg-emerald-950/20 p-3 rounded border border-emerald-500/20">
                    <p>
                      <strong>SMS:</strong> "[{activeTenant.name}] Hi {currentOrder.customerName}, your order #{currentOrder.id} has been DELIVERED by {currentOrder.driverName || 'our driver'}! Thank you for shopping with us."
                    </p>
                    <div className="mt-2 text-[11px] text-[#A1A1AA] flex items-center justify-between">
                      <span>Recipient: {currentOrder.customerPhone}</span>
                      <span>Gateway: Safaricom SMS</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: M-Pesa Payment Status & Order Summary */}
          <div className="space-y-6">
            {/* M-Pesa Payment Card */}
            <div className="bg-[#1C1C1F] rounded-xl p-6 shadow-sm border border-[#27272A] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Payment Status</span>
                <span className="text-xs font-mono font-bold text-[#71717A]">M-PESA KENYA</span>
              </div>

              {currentOrder.paymentInfo.status === 'paid' ? (
                <div className="bg-[#09090B] rounded-lg p-4 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Payment Verified & Paid</span>
                  </div>
                  <div className="font-mono text-xs text-[#A1A1AA] space-y-1">
                    <div>Receipt: <span className="font-bold text-[#FAFAFA]">{currentOrder.paymentInfo.mpesaTransactionId}</span></div>
                    <div>Phone: <span>{currentOrder.paymentInfo.phoneNumber}</span></div>
                    <div>Paid: <span>{new Date(currentOrder.paymentInfo.paidAt || Date.now()).toLocaleTimeString()}</span></div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#09090B] rounded-lg p-4 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Payment Pending (Unpaid)</span>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">
                    Pay KES {currentOrder.totalAmount} directly using M-Pesa STK Push.
                  </p>
                  <button
                    onClick={() => onTriggerMpesa(currentOrder)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay KES {currentOrder.totalAmount} via M-Pesa</span>
                  </button>
                </div>
              )}

              {/* Order Items Breakdown */}
              <div className="border-t border-[#27272A] pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#FAFAFA] uppercase tracking-wider">Order Items</h4>
                <div className="space-y-2">
                  {currentOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-[#A1A1AA]">
                      <span>
                        <span className="font-bold text-[#FAFAFA]">{item.quantity}x</span> {item.name}
                      </span>
                      <span className="font-mono font-semibold text-[#FAFAFA]">
                        {formatCurrency(item.quantity * item.unitPrice, orderTenant.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#27272A] pt-3 flex justify-between text-sm font-bold text-[#FAFAFA]">
                  <span>Total Amount</span>
                  <span className="text-emerald-400 font-mono">
                    {formatCurrency(currentOrder.totalAmount, orderTenant.currency)}
                  </span>
                </div>
              </div>

              {/* Delivery Contact Info */}
              <div className="border-t border-[#27272A] pt-4 space-y-2 text-xs text-[#A1A1AA]">
                <h4 className="font-semibold text-[#FAFAFA] uppercase tracking-wider text-[11px]">Delivery Info</h4>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#71717A]" />
                  <span className="font-bold text-[#FAFAFA]">{currentOrder.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#71717A]" />
                  <span className="font-mono">{currentOrder.customerPhone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#71717A] shrink-0 mt-0.5" />
                  <span>{currentOrder.deliveryAddress}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
