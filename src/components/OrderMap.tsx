import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GPSLocation } from '../types';
import { Clock, Compass, Gauge, MapPin, Navigation, Sparkles, Truck } from 'lucide-react';
import { fetchRoadRoute } from '../lib/routing';
import { GoogleMapsRadarModal } from './GoogleMapsRadarModal';

interface OrderMapProps {
  storeLocation?: GPSLocation;
  driverLocation?: GPSLocation;
  destinationLocation?: GPSLocation;
  driverName?: string;
  customerName?: string;
  storeName?: string;
  status?: string;
  estimatedArrivalMinutes?: number;
}

export const OrderMap: React.FC<OrderMapProps> = ({
  storeLocation,
  driverLocation,
  destinationLocation,
  driverName = 'Driver',
  customerName = 'Customer',
  storeName = 'Store',
  status = 'in_progress',
  estimatedArrivalMinutes = 12,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);
  const hasFittedBoundsRef = useRef<boolean>(false);
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);
  const [isMapsRadarOpen, setIsMapsRadarOpen] = useState(false);

  // Fetch real road route geometry whenever store or destination changes
  useEffect(() => {
    const start = storeLocation || driverLocation;
    const end = destinationLocation;

    if (start && end) {
      fetchRoadRoute({ lat: start.lat, lng: start.lng }, { lat: end.lat, lng: end.lng })
        .then((coords) => {
          if (coords && coords.length > 0) {
            setRoadPath(coords);
          }
        })
        .catch((err) => console.error('Error fetching road route for map:', err));
    }
  }, [storeLocation?.lat, storeLocation?.lng, destinationLocation?.lat, destinationLocation?.lng]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center fallback (Nairobi CBD)
    const initialLat = driverLocation?.lat || storeLocation?.lat || -1.286389;
    const initialLng = driverLocation?.lng || storeLocation?.lng || 36.817223;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([initialLat, initialLng], 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Helper to create custom SVG icons
    const createCustomIcon = (type: 'store' | 'driver' | 'customer') => {
      let iconHtml = '';
      let iconSize: [number, number] = [44, 44];
      let iconAnchor: [number, number] = [22, 22];

      if (type === 'store') {
        iconHtml = `
          <div class="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white ring-4 ring-indigo-100 transform transition-transform hover:scale-110">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>`;
      } else if (type === 'driver') {
        const etaText = status === 'delivered' ? 'Delivered' : `ETA ~${estimatedArrivalMinutes} min`;
        iconSize = [80, 70];
        iconAnchor = [40, 50];
        iconHtml = `
          <div class="relative flex flex-col items-center group pointer-events-auto">
            <!-- Floating Live ETA Tag above Delivery Vehicle -->
            <div class="mb-1 bg-[#09090B]/95 text-emerald-400 font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow-xl flex items-center gap-1.5 whitespace-nowrap animate-bounce">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              ${etaText}
            </div>

            <!-- Pulsing Delivery Vehicle Marker Badge -->
            <div class="relative">
              <div class="absolute -inset-2 bg-emerald-500 rounded-2xl opacity-30 animate-ping"></div>
              <div class="relative w-12 h-12 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-emerald-500/30 transition-transform hover:scale-110">
                <!-- Delivery Van/Truck Icon -->
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 18h2m4 0h2M3 9a1 1 0 011-1h10a1 1 0 011 1v7H3V9zm12 0h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16h-2M5 18a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z"></path>
                </svg>
              </div>
            </div>
          </div>`;
      } else {
        iconHtml = `
          <div class="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white ring-4 ring-rose-100 transform transition-transform hover:scale-110">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>`;
      }

      return L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker transition-all duration-[2400ms] ease-linear',
        iconSize: iconSize,
        iconAnchor: iconAnchor,
      });
    };

    const latLngs: L.LatLngExpression[] = [];

    // Store Marker
    if (storeLocation) {
      const storeLatLng: L.LatLngExpression = [storeLocation.lat, storeLocation.lng];
      latLngs.push(storeLatLng);

      if (!markersRef.current['store']) {
        markersRef.current['store'] = L.marker(storeLatLng, {
          icon: createCustomIcon('store'),
        }).addTo(map);
      } else {
        markersRef.current['store'].setLatLng(storeLatLng);
      }
      markersRef.current['store'].bindPopup(`<b>${storeName}</b><br/>Store Dispatch Hub`);
    }

    // Driver Marker
    if (driverLocation) {
      const driverLatLng: L.LatLngExpression = [driverLocation.lat, driverLocation.lng];
      latLngs.push(driverLatLng);

      const driverIcon = createCustomIcon('driver');
      if (!markersRef.current['driver']) {
        markersRef.current['driver'] = L.marker(driverLatLng, {
          icon: driverIcon,
        }).addTo(map);
      } else {
        markersRef.current['driver'].setIcon(driverIcon);
        markersRef.current['driver'].setLatLng(driverLatLng);
      }
      markersRef.current['driver'].bindPopup(
        `<b>${driverName} (Delivery Vehicle)</b><br/>Speed: ${driverLocation.speed || 0} km/h<br/>ETA: ~${estimatedArrivalMinutes} mins`
      );
    }

    // Destination Marker
    if (destinationLocation) {
      const destLatLng: L.LatLngExpression = [destinationLocation.lat, destinationLocation.lng];
      latLngs.push(destLatLng);

      if (!markersRef.current['destination']) {
        markersRef.current['destination'] = L.marker(destLatLng, {
          icon: createCustomIcon('customer'),
        }).addTo(map);
      } else {
        markersRef.current['destination'].setLatLng(destLatLng);
      }
      markersRef.current['destination'].bindPopup(`<b>${customerName}</b><br/>${destinationLocation.addressName || 'Delivery Address'}`);
    }

    // Polyline Route along Real Streets
    const linePath: L.LatLngExpression[] =
      roadPath.length > 0
        ? (roadPath as L.LatLngExpression[])
        : latLngs;

    if (linePath.length > 1) {
      if (!polylineRef.current) {
        polylineRef.current = L.polyline(linePath, {
          color: '#10B981',
          weight: 5,
          opacity: 0.85,
          dashArray: status === 'delivered' ? undefined : '8, 8',
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs(linePath);
      }

      // Fit bounds only on initial render or when requested
      if (!hasFittedBoundsRef.current && latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        hasFittedBoundsRef.current = true;
      }
    }
  }, [
    storeLocation,
    driverLocation,
    destinationLocation,
    driverName,
    customerName,
    storeName,
    status,
    estimatedArrivalMinutes,
    roadPath,
  ]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const points: L.LatLngExpression[] = [];
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);
    if (destinationLocation) points.push([destinationLocation.lat, destinationLocation.lng]);
    if (storeLocation) points.push([storeLocation.lat, storeLocation.lng]);

    if (points.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
    }
  };

  return (
    <div className="relative w-full h-[450px] rounded-xl overflow-hidden border border-[#27272A] shadow-inner bg-[#09090B]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating ETA Badge Overlay Top-Left */}
      <div className="absolute top-3 left-3 z-[400] bg-[#09090B]/95 backdrop-blur-md text-[#FAFAFA] px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-500/30 flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
          <Clock className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">
            Driver Arrival ETA
          </div>
          <div className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-2">
            <span>{status === 'delivered' ? 'Delivered' : `~ ${estimatedArrivalMinutes} Minutes`}</span>
            {status !== 'delivered' && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-sans px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                En Route
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Map Control Toolbar */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <button
          onClick={() => setIsMapsRadarOpen(true)}
          className="bg-[#1C1C1F]/95 hover:bg-red-500/20 text-[#FAFAFA] p-2.5 rounded-lg shadow-md border border-red-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 group"
          title="Google Maps AI Grounding"
        >
          <MapPin className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform animate-pulse" />
          <span>Google Maps Radar</span>
          <Sparkles className="w-3 h-3 text-emerald-400" />
        </button>

        <button
          onClick={handleRecenter}
          className="bg-[#1C1C1F]/95 hover:bg-[#27272A] text-[#FAFAFA] p-2.5 rounded-lg shadow-md border border-[#27272A] transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95"
          title="Recenter Map"
        >
          <Navigation className="w-4 h-4 text-blue-400" />
          <span>Recenter View</span>
        </button>
      </div>

      {/* Google Maps AI Radar Grounding Modal */}
      <GoogleMapsRadarModal
        isOpen={isMapsRadarOpen}
        onClose={() => setIsMapsRadarOpen(false)}
        location={driverLocation || storeLocation || destinationLocation}
        locationName={driverName ? `Driver ${driverName} Location` : storeName || customerName}
      />

      {/* Live Driver Tracking Badge */}
      {driverLocation && (
        <div className="absolute bottom-4 left-4 z-[400] bg-[#09090B]/90 backdrop-blur-md text-[#FAFAFA] px-4 py-2.5 rounded-lg shadow-xl border border-[#27272A] flex items-center gap-3 max-w-sm">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0">
            <Truck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-semibold flex items-center justify-between gap-3 text-[#A1A1AA]">
              <span className="flex items-center gap-1 truncate">
                <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {driverName}
              </span>
              <span className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                <Gauge className="w-3 h-3" />
                {driverLocation.speed ? `${driverLocation.speed} km/h` : '0 km/h'}
              </span>
            </div>
            <div className="text-xs font-medium text-[#FAFAFA] truncate">
              {driverLocation.addressName || `${driverLocation.lat.toFixed(4)}, ${driverLocation.lng.toFixed(4)}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
