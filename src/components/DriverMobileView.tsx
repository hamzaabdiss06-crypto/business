import React, { useState, useEffect } from 'react';
import { Order, StaffDriver, Tenant, OrderStatus } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OrderMap } from './OrderMap';
import {
  Car,
  CheckCircle2,
  Compass,
  Gauge,
  MapPin,
  Navigation,
  Phone,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  User,
  Zap,
} from 'lucide-react';

interface DriverMobileViewProps {
  tenant: Tenant;
  orders: Order[];
  drivers: StaffDriver[];
}

export const DriverMobileView: React.FC<DriverMobileViewProps> = ({ tenant, orders, drivers }) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || 'drv-01');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [isSimulatingMove, setIsSimulatingMove] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(45); // Target driving speed in km/h
  const [useActualBrowserGps, setUseActualBrowserGps] = useState(false);

  const driver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  const activeOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  // Browser Geolocation integration
  useEffect(() => {
    if (!useActualBrowserGps || !activeOrder) return;

    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported in your environment.');
      setUseActualBrowserGps(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        try {
          await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tenant.id, orderId: activeOrder.id, updates: {
            'currentGpsLocation.lat': latitude,
            'currentGpsLocation.lng': longitude,
            'currentGpsLocation.speed': Math.round((speed || 0) * 3.6), // convert m/s to km/h
            'currentGpsLocation.heading': heading || 0,
            'currentGpsLocation.updatedAt': new Date().toISOString(),
            'currentGpsLocation.addressName': 'Live Device GPS',
            updatedAt: new Date().toISOString(),
          } })
          });
        } catch (err) {
          console.error('Error updating browser GPS location:', err);
        }
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [useActualBrowserGps, activeOrder, tenant.id]);

  // Automatic GPS step movement simulator towards destination pin
  useEffect(() => {
    if (!isSimulatingMove || !activeOrder) return;

    const interval = setInterval(async () => {
      const current = activeOrder.currentGpsLocation;
      const target = activeOrder.destinationLocation;

      // Distance remaining (approx degrees)
      const dist = Math.hypot(target.lat - current.lat, target.lng - current.lng);

      if (dist < 0.0003) {
        setIsSimulatingMove(false);
        try {
          await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tenant.id, orderId: activeOrder.id, updates: {
            status: 'delivered',
            'currentGpsLocation.lat': target.lat,
            'currentGpsLocation.lng': target.lng,
            'currentGpsLocation.speed': 0,
            'currentGpsLocation.addressName': 'Delivered at Destination',
            estimatedArrivalMinutes: 0,
            updatedAt: new Date().toISOString(),
          } })
          });
        } catch (err) {
          console.error('Delivery finalization error:', err);
        }
        return;
      }

      // Calculate step size based on target speed (km/h)
      // 1 deg lat ≈ 111 km. At simSpeed km/h, 2 sec move = (simSpeed / 3600 * 2) / 111 deg
      // We scale slightly for smooth visual progression
      const stepDistanceDeg = (simSpeed / 3600 * 2 / 111) * 2.5;
      const stepFraction = Math.min(1, stepDistanceDeg / dist);

      const newLat = current.lat + (target.lat - current.lat) * stepFraction;
      const newLng = current.lng + (target.lng - current.lng) * stepFraction;

      // Add realistic traffic speed fluctuation ± 4 km/h
      const currentSpeed = Math.max(12, Math.round(simSpeed + (Math.random() * 8 - 4)));

      // Calculate heading angle
      const heading = Math.round((Math.atan2(target.lng - current.lng, target.lat - current.lat) * 180) / Math.PI);

      try {
        await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tenant.id, orderId: activeOrder.id, updates: {
          'currentGpsLocation.lat': newLat,
          'currentGpsLocation.lng': newLng,
          'currentGpsLocation.speed': currentSpeed,
          'currentGpsLocation.heading': heading,
          'currentGpsLocation.updatedAt': new Date().toISOString(),
          'currentGpsLocation.addressName': `En Route @ ${currentSpeed} km/h`,
          estimatedArrivalMinutes: Math.max(1, Math.round((dist * 111) / (simSpeed / 60))),
          updatedAt: new Date().toISOString(),
        } })
          });
      } catch (err) {
        console.error('Simulation update error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulatingMove, simSpeed, activeOrder, tenant.id]);

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!activeOrder) return;
    try {
      await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tenant.id, orderId: activeOrder.id, updates: {
        status: status,
        updatedAt: new Date().toISOString(),
      } })
          });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Handheld Terminal Header */}
      <div className="bg-[#1C1C1F] rounded-xl p-6 text-[#FAFAFA] shadow-md border border-[#27272A] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-blue-400">Driver Courier App</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h2 className="text-xl font-bold text-[#FAFAFA]">{driver?.name || 'Driver Console'}</h2>
          </div>
        </div>

        {/* Driver Selector & Active Order Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#09090B] px-3 py-1.5 rounded-lg border border-[#27272A] text-xs">
            <label className="block text-[10px] text-[#A1A1AA] font-semibold uppercase">Switch Driver Profile</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="bg-transparent text-[#FAFAFA] font-semibold focus:outline-none cursor-pointer"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#1C1C1F]">
                  {d.name} ({d.role})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[#09090B] px-3 py-1.5 rounded-lg border border-[#27272A] text-xs">
            <label className="block text-[10px] text-[#A1A1AA] font-semibold uppercase">Active Assigned Order</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="bg-transparent text-[#FAFAFA] font-semibold focus:outline-none cursor-pointer"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id} className="bg-[#1C1C1F]">
                  {o.id} - {o.customerName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeOrder && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Driver Map Panel */}
          <div className="md:col-span-2 bg-[#1C1C1F] rounded-xl p-6 shadow-sm border border-[#27272A] space-y-4 text-[#FAFAFA]">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#FAFAFA]">Driver Live GPS Telemetry</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE CONSTANT MOVEMENT ACTIVE
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  Broadcasting live coordinates & speed continuously to customer map & tenant dispatch.
                </p>
              </div>

              {/* Simulation Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-[#09090B] p-1 rounded-lg border border-[#27272A] text-xs">
                  <Gauge className="w-3.5 h-3.5 text-[#A1A1AA] ml-1" />
                  <span className="text-[10px] text-[#A1A1AA] font-semibold uppercase px-1">Cruise Speed:</span>
                  {[35, 60, 95].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSimSpeed(spd)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        simSpeed === spd
                          ? 'bg-blue-600 text-white'
                          : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                      }`}
                    >
                      {spd} km/h
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsSimulatingMove(!isSimulatingMove)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    isSimulatingMove
                      ? 'bg-emerald-500 text-black font-semibold animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>{isSimulatingMove ? 'Turbo GPS Drive On' : 'Boost Driver Movement'}</span>
                </button>
              </div>
            </div>

            <OrderMap
              storeLocation={tenant.storeLocation}
              driverLocation={activeOrder.currentGpsLocation}
              destinationLocation={activeOrder.destinationLocation}
              driverName={driver?.name}
              customerName={activeOrder.customerName}
              storeName={tenant.name}
              status={activeOrder.status}
            />

            {/* GPS Telemetry Bar */}
            <div className="bg-[#09090B] rounded-lg p-4 text-[#FAFAFA] flex items-center justify-between text-xs font-mono border border-[#27272A]">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span>
                  Lat: {activeOrder.currentGpsLocation.lat.toFixed(5)}, Lng: {activeOrder.currentGpsLocation.lng.toFixed(5)}
                </span>
              </div>
              <div className="text-emerald-400 font-bold">
                Speed: {activeOrder.currentGpsLocation.speed || 0} km/h
              </div>
            </div>
          </div>

          {/* Driver Order Controls Panel */}
          <div className="bg-[#1C1C1F] rounded-xl p-6 shadow-sm border border-[#27272A] space-y-5 text-[#FAFAFA]">
            <div>
              <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Active Delivery</span>
              <h3 className="text-xl font-bold text-[#FAFAFA] font-mono mt-0.5">{activeOrder.id}</h3>
            </div>

            {/* Customer Details */}
            <div className="bg-[#09090B] rounded-lg p-4 border border-[#27272A] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#FAFAFA] text-sm">{activeOrder.customerName}</span>
                <a
                  href={`tel:${activeOrder.customerPhone}`}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium flex items-center gap-1 transition-colors"
                >
                  <Phone className="w-3 h-3" /> Call
                </a>
              </div>
              <div className="text-[#A1A1AA] flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>{activeOrder.deliveryAddress}</span>
              </div>
            </div>

            {/* Status Update Actions */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                Update Order Status
              </label>

              <button
                onClick={() => handleUpdateStatus('in_progress')}
                className={`w-full py-2.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                  activeOrder.status === 'in_progress'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-[#09090B] text-[#FAFAFA] border border-[#27272A] hover:bg-[#27272A]'
                }`}
              >
                <span>1. Order In Preparation</span>
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleUpdateStatus('out_for_delivery')}
                className={`w-full py-2.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                  activeOrder.status === 'out_for_delivery'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-[#09090B] text-[#FAFAFA] border border-[#27272A] hover:bg-[#27272A]'
                }`}
              >
                <span>2. Out for Delivery</span>
                <Car className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleUpdateStatus('delivered')}
                className={`w-full py-2.5 px-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                  activeOrder.status === 'delivered'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-[#09090B] text-[#FAFAFA] border border-[#27272A] hover:bg-[#27272A]'
                }`}
              >
                <span>3. Mark as Delivered</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
