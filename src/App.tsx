import { signInAnonymously } from 'firebase/auth';
import { auth } from './lib/firebase';
import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { seedDatabaseIfEmpty } from './lib/seedData';
import { Tenant, Order, StaffDriver, UserRole, SmsLog } from './types';
import { Navbar } from './components/Navbar';
import { TenantAdminDashboard } from './components/TenantAdminDashboard';
import { CustomerOrderTracker } from './components/CustomerOrderTracker';
import { DriverMobileView } from './components/DriverMobileView';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { MpesaModal } from './components/MpesaModal';
import { TenantConfigModal } from './components/TenantConfigModal';
import { CreateOrderModal } from './components/CreateOrderModal';
import { CloudFunctionLogsModal } from './components/CloudFunctionLogsModal';
import { SmsNotificationToast } from './components/SmsNotificationToast';
import { triggerOrderDeliveredCloudFunction, subscribeToSmsNotifications } from './lib/cloudFunctionSms';
import { fetchRoadRoute, getPointAlongRoadPath, calculatePathDistanceKm } from './lib/routing';
import { Layers, ShieldCheck, Database, Smartphone, Zap } from 'lucide-react';

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<StaffDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & Role states
  const [activeTab, setActiveTab] = useState<'tenant_admin' | 'customer_tracker' | 'driver_view' | 'super_admin'>('tenant_admin');
  const [currentRole, setCurrentRole] = useState<UserRole>('tenant_admin');

  // Selected Order to track
  const [selectedOrderToTrack, setSelectedOrderToTrack] = useState<Order | null>(null);

  // Modal states
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [mpesaOrderTarget, setMpesaOrderTarget] = useState<Order | null>(null);

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isCloudFunctionsModalOpen, setIsCloudFunctionsModalOpen] = useState(false);

  // SMS Toast notification state
  const [currentSmsToast, setCurrentSmsToast] = useState<{ log: SmsLog; order: Order } | null>(null);

  // Track previous order statuses to trigger Cloud Function on delivery transition
  const prevOrdersStatusRef = useRef<Record<string, string>>({});
  const activeRoadPathsRef = useRef<Record<string, any[]>>({});
  const activeRoadProgressRef = useRef<Record<string, number>>({});

  // Subscribe to SMS Notifications for instant toast popups
  useEffect(() => {
    const unsubscribe = subscribeToSmsNotifications((log, order) => {
      setCurrentSmsToast({ log, order });
    });
    return unsubscribe;
  }, []);

  // Initialize and poll tenants
  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function init() {
      try {
        await fetch('/api/demo/seed', { method: 'POST' });
        
        const fetchTenants = async () => {
          const res = await fetch('/api/tenants');
          const list = await res.json();
          setTenants(list);
          if (list.length > 0) {
            setActiveTenant(prev => prev || list[0]);
          }
          setIsLoading(false);
        };

        await fetchTenants();
        interval = setInterval(fetchTenants, 5000); // Poll every 5s for demo
      } catch (e) {
        console.error("Init error", e);
        setIsLoading(false);
      }
    }

    init();
    return () => clearInterval(interval);
  }, []);

  // Listen to orders & drivers under activeTenant via polling
  useEffect(() => {
    if (!activeTenant) return;
    
    let interval: NodeJS.Timeout;

    const fetchTenantData = async () => {
      try {
        const [ordersRes, staffRes] = await Promise.all([
          fetch(`/api/tenants/${activeTenant.id}/orders`),
          fetch(`/api/tenants/${activeTenant.id}/staff`)
        ]);

        const orderList = await ordersRes.json();
        const driverList = await staffRes.json();

        orderList.forEach((order) => {
          const prevStatus = prevOrdersStatusRef.current[order.id];
          if (
            order.status === 'delivered' &&
            !order.smsNotificationSent &&
            prevStatus &&
            prevStatus !== 'delivered'
          ) {
            console.log(`⚡ [Cloud Function Trigger] Order #${order.id} status changed to 'delivered'. Dispatching SMS...`);
            triggerOrderDeliveredCloudFunction(order, activeTenant);
          }
          prevOrdersStatusRef.current[order.id] = order.status;
        });

        orderList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setOrders(orderList);
        setDrivers(driverList);
      } catch (err) {
        console.error("Failed to fetch tenant data:", err);
      }
    };

    fetchTenantData();
    interval = setInterval(fetchTenantData, 5000);

    return () => clearInterval(interval);
  }, [activeTenant]);

  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Enhanced GPS Telemetry simulation along real road network paths
  useEffect(() => {
    if (!activeTenant || activeTenant.id !== 'tenant-safari-eats') return;

    const interval = setInterval(() => {
      const currentOrders = ordersRef.current;
      if (currentOrders.length === 0) return;

      const inTransitOrders = currentOrders.filter(
        (o) =>
          (o.status === 'out_for_delivery' || o.status === 'picked_up') &&
          o.currentGpsLocation &&
          o.destinationLocation
      );

      // If no order is currently in transit, reset the primary demo order (ORD-SE-1001) back out for delivery
      if (inTransitOrders.length === 0) {
        const demoOrder = currentOrders[0];
        if (demoOrder && activeTenant.storeLocation && demoOrder.destinationLocation) {
          delete activeRoadPathsRef.current[demoOrder.id];
          delete activeRoadProgressRef.current[demoOrder.id];
          fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: activeTenant.id, orderId: demoOrder.id, updates: {
              status: 'out_for_delivery',
              currentGpsLocation: {
                lat: activeTenant.storeLocation.lat,
                lng: activeTenant.storeLocation.lng,
                speed: 42,
                addressName: 'Departed Store Dispatch',
                updatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            } })
          }).catch((e) => console.error('Error auto-starting demo order movement:', e));
        }
        return;
      }

      inTransitOrders.forEach(async (order) => {
        const storeLoc = activeTenant.storeLocation;
        const target = order.destinationLocation;
        if (!storeLoc || !target) return;

        // Fetch or retrieve road path waypoints for this order
        let roadPath = activeRoadPathsRef.current[order.id];
        if (!roadPath || roadPath.length === 0) {
          try {
            roadPath = await fetchRoadRoute(
              { lat: storeLoc.lat, lng: storeLoc.lng },
              { lat: target.lat, lng: target.lng }
            );
            activeRoadPathsRef.current[order.id] = roadPath;
          } catch (err) {
            console.error('Failed to load road route path:', err);
            return;
          }
        }

        let progress = activeRoadProgressRef.current[order.id] || 0.02;

        // Advance driver location step smoothly along the road network (~0.007 progress per tick for natural speed)
        progress += 0.007;
        activeRoadProgressRef.current[order.id] = progress;

        // If driver reached destination along the road path
        if (progress >= 1.0) {
          try {
            await fetch('/api/demo/update-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId: activeTenant.id, orderId: order.id, updates: {
                status: 'delivered',
                'currentGpsLocation.lat': target.lat,
                'currentGpsLocation.lng': target.lng,
                'currentGpsLocation.speed': 0,
                'currentGpsLocation.addressName': 'Delivered at Destination',
                estimatedArrivalMinutes: 0,
                updatedAt: new Date().toISOString(),
              } })
            });
            delete activeRoadPathsRef.current[order.id];
            delete activeRoadProgressRef.current[order.id];
          } catch (err) {
            console.error('Error finalizing delivery GPS:', err);
          }
          return;
        }

        // Get exact vehicle point and orientation along the street geometry
        const roadPoint = getPointAlongRoadPath(roadPath, progress);
        // Dynamic speed calculation with realistic street traffic (36 - 54 km/h)
        const currentSpeed = Math.max(22, Math.round(42 + (Math.random() * 10 - 5)));

        // Calculate remaining road distance and ETA
        const totalKm = calculatePathDistanceKm(roadPath);
        const remainingKm = Math.max(0.1, totalKm * (1 - progress));
        const remainingMinutes = Math.max(1, Math.round((remainingKm / currentSpeed) * 60));

        try {
          await fetch('/api/demo/update-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: activeTenant.id, orderId: order.id, updates: {
              'currentGpsLocation.lat': roadPoint.lat,
              'currentGpsLocation.lng': roadPoint.lng,
              'currentGpsLocation.speed': currentSpeed,
              'currentGpsLocation.heading': roadPoint.heading,
              'currentGpsLocation.updatedAt': new Date().toISOString(),
              'currentGpsLocation.addressName': `Transit on City Street @ ${currentSpeed} km/h`,
              estimatedArrivalMinutes: remainingMinutes,
              updatedAt: new Date().toISOString(),
            } })
          });
        } catch (err) {
          console.error('Error updating driver GPS telemetry along road:', err);
        }
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [activeTenant]);

  const handleOpenMpesaModal = (order: Order) => {
    setMpesaOrderTarget(order);
    setIsMpesaModalOpen(true);
  };

  const handleTrackOrderFromAdmin = (order: Order) => {
    setSelectedOrderToTrack(order);
    setActiveTab('customer_tracker');
  };

  if (isLoading || !activeTenant) {
    return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-tight">Initializing Multi-Tenant Firestore Engine...</h2>
        <p className="text-sm text-[#A1A1AA] mt-1">Connecting to tenant database partitions & M-Pesa gateway</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans flex flex-col antialiased">
      {/* Navbar */}
      <Navbar
        tenants={tenants}
        activeTenant={activeTenant}
        onSelectTenant={(t) => {
          setActiveTenant(t);
          setSelectedOrderToTrack(null);
        }}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        onOpenCreateTenant={() => setIsTenantModalOpen(true)}
        onOpenCloudFunctionsModal={() => setIsCloudFunctionsModalOpen(true)}
      />

      {/* Floating SMS Notification Toast */}
      <SmsNotificationToast
        currentLog={currentSmsToast}
        onClose={() => setCurrentSmsToast(null)}
        onOpenLogsModal={() => setIsCloudFunctionsModalOpen(true)}
      />

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'tenant_admin' && (
          <TenantAdminDashboard
            tenant={activeTenant}
            orders={orders}
            drivers={drivers}
            onSelectOrderToTrack={handleTrackOrderFromAdmin}
            onOpenCreateOrder={() => setIsCreateOrderModalOpen(true)}
            onOpenTenantConfig={() => setIsTenantModalOpen(true)}
            onTriggerMpesa={handleOpenMpesaModal}
          />
        )}

        {activeTab === 'customer_tracker' && (
          <CustomerOrderTracker
            tenants={tenants}
            activeTenant={activeTenant}
            orders={orders}
            onTriggerMpesa={handleOpenMpesaModal}
            selectedOrder={selectedOrderToTrack}
          />
        )}

        {activeTab === 'driver_view' && (
          <DriverMobileView
            tenant={activeTenant}
            orders={orders}
            drivers={drivers}
          />
        )}

        {activeTab === 'super_admin' && (
          <SuperAdminDashboard
            tenants={tenants}
            onOpenCreateTenant={() => setIsTenantModalOpen(true)}
            onSelectTenant={(t) => {
              setActiveTenant(t);
              setActiveTab('tenant_admin');
            }}
          />
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-[#09090B] border-t border-[#1C1C1F] text-[#A1A1AA] py-6 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-500" />
            <div>
              <span className="font-bold text-white">OmniTrack Multi-Tenant Architecture</span>
              <p className="text-[11px] text-[#A1A1AA]">Firestore Path: <code className="font-mono text-emerald-400">tenants/{activeTenant.id}/orders</code></p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" /> M-Pesa Daraja Connected
            </span>
            <span className="flex items-center gap-1 text-blue-400 font-semibold">
              <Database className="w-4 h-4" /> Real-time Firestore Sync
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isMpesaModalOpen && mpesaOrderTarget && (
        <MpesaModal
          order={mpesaOrderTarget}
          tenant={activeTenant}
          isOpen={isMpesaModalOpen}
          onClose={() => setIsMpesaModalOpen(false)}
        />
      )}

      {isTenantModalOpen && (
        <TenantConfigModal
          isOpen={isTenantModalOpen}
          onClose={() => setIsTenantModalOpen(false)}
          existingTenant={activeTenant}
          onTenantCreated={(newT) => setActiveTenant(newT)}
        />
      )}

      {isCreateOrderModalOpen && (
        <CreateOrderModal
          isOpen={isCreateOrderModalOpen}
          onClose={() => setIsCreateOrderModalOpen(false)}
          tenant={activeTenant}
        />
      )}

      {isCloudFunctionsModalOpen && (
        <CloudFunctionLogsModal
          isOpen={isCloudFunctionsModalOpen}
          onClose={() => setIsCloudFunctionsModalOpen(false)}
          tenant={activeTenant}
          orders={orders}
        />
      )}
    </div>
  );
}
