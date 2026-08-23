const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const newEffect = `  const ordersRef = useRef<Order[]>(orders);
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
              'currentGpsLocation.addressName': \`Transit on City Street @ \${currentSpeed} km/h\`,
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
  }, [activeTenant]);`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('const ordersRef = useRef<Order[]>(orders);'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('}, [activeTenant]);'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1, newEffect);
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log('Patched cleanly');
} else {
  console.log('Not found', startIdx, endIdx);
}
