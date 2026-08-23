// Utility for fetching real road paths via OSRM (OpenSourceRoutingMachine) with realistic street-grid fallbacks

export interface Point {
  lat: number;
  lng: number;
}

// Memory cache for fetched road routes to ensure fast re-renders and smooth tracking
const routeCache = new Map<string, [number, number][]>();

/**
 * Fetches a real street-level driving route from OSRM API.
 * Falls back to a multi-segment city street grid if OSRM is unreachable.
 */
export async function fetchRoadRoute(start: Point, end: Point): Promise<[number, number][]> {
  const cacheKey = `${start.lat.toFixed(4)},${start.lng.toFixed(4)}->${end.lat.toFixed(4)},${end.lng.toFixed(4)}`;
  
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes[0] && data.routes[0].geometry) {
        // OSRM returns coordinates as [longitude, latitude]. Convert to [latitude, longitude] for Leaflet
        const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
        const roadPoints: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

        if (roadPoints.length > 1) {
          routeCache.set(cacheKey, roadPoints);
          return roadPoints;
        }
      }
    }
  } catch (err) {
    console.warn('OSRM routing API unavailable or timed out, generating realistic street grid path:', err);
  }

  // Fallback: Generate realistic city block/street grid route with turns
  const fallbackRoute = generateGridRoadPath(start, end);
  routeCache.set(cacheKey, fallbackRoute);
  return fallbackRoute;
}

/**
 * Generates a realistic street-grid path with intermediate road intersection turns.
 */
export function generateGridRoadPath(start: Point, end: Point): [number, number][] {
  const points: [number, number][] = [];
  
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;

  // Primary intersection 1: Avenue turn (halfway across latitude)
  const midLat1 = start.lat + dLat * 0.45;
  const midLng1 = start.lng + dLng * 0.05;

  // Intersection 2: Main Street turn
  const midLat2 = start.lat + dLat * 0.50;
  const midLng2 = start.lng + dLng * 0.85;

  // Intersection 3: Ring Road approach
  const midLat3 = start.lat + dLat * 0.90;
  const midLng3 = start.lng + dLng * 0.90;

  const keyWaypoints: Point[] = [
    start,
    { lat: midLat1, lng: midLng1 },
    { lat: midLat2, lng: midLng2 },
    { lat: midLat3, lng: midLng3 },
    end,
  ];

  // Interpolate intermediate sub-points along each road segment for smooth movement
  for (let i = 0; i < keyWaypoints.length - 1; i++) {
    const p1 = keyWaypoints[i];
    const p2 = keyWaypoints[i + 1];
    const steps = 8;

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push([
        p1.lat + (p2.lat - p1.lat) * t,
        p1.lng + (p2.lng - p1.lng) * t,
      ]);
    }
  }

  points.push([end.lat, end.lng]);
  return points;
}

/**
 * Calculates total road distance in kilometers along a waypoint path.
 */
export function calculatePathDistanceKm(path: [number, number][]): number {
  let totalKm = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [lat1, lng1] = path[i];
    const [lat2, lng2] = path[i + 1];
    
    // Haversine approximation
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalKm += 6371 * c;
  }
  return totalKm;
}

/**
 * Given a progress value from 0.0 to 1.0 along a road path,
 * returns the exact GPS position and calculated heading angle in degrees.
 */
export function getPointAlongRoadPath(
  path: [number, number][],
  progress: number
): { lat: number; lng: number; heading: number } {
  if (path.length === 0) {
    return { lat: 0, lng: 0, heading: 0 };
  }
  if (path.length === 1 || progress <= 0) {
    return { lat: path[0][0], lng: path[0][1], heading: 0 };
  }
  if (progress >= 1) {
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    const heading = calculateHeading(prev[0], prev[1], last[0], last[1]);
    return { lat: last[0], lng: last[1], heading };
  }

  // Find cumulative segment lengths
  const segmentLengths: number[] = [];
  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    segmentLengths.push(d);
    totalDist += d;
  }

  const targetDist = progress * totalDist;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist) {
      const segProgress = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const [lat1, lng1] = path[i];
      const [lat2, lng2] = path[i + 1];

      const lat = lat1 + (lat2 - lat1) * segProgress;
      const lng = lng1 + (lng2 - lng1) * segProgress;
      const heading = calculateHeading(lat1, lng1, lat2, lng2);

      return { lat, lng, heading };
    }
    accumulated += segLen;
  }

  const endPoint = path[path.length - 1];
  return { lat: endPoint[0], lng: endPoint[1], heading: 0 };
}

function calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const heading = (Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI;
  return Math.round((heading + 360) % 360);
}
