import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { socketServer } from '../websocket/server.js';

// Calculate distance in meters using Haversine formula
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// In-memory tracker for vehicle state relative to fences: vehicleId -> Map<geofenceId, boolean (isInside)>
const vehicleFenceStates = new Map<string, Map<string, boolean>>();

export function evaluateGeofences(vehicleId: string, lat: number, lng: number, tenantId: string, shipmentId?: string): void {
  try {
    const fences = db.prepare('SELECT * FROM geofences WHERE tenant_id = ?').all(tenantId) as any[];
    if (!fences || fences.length === 0) return;

    if (!vehicleFenceStates.has(vehicleId)) {
      vehicleFenceStates.set(vehicleId, new Map<string, boolean>());
    }
    const states = vehicleFenceStates.get(vehicleId)!;

    for (const fence of fences) {
      const distance = calculateDistanceMeters(lat, lng, fence.latitude, fence.longitude);
      const isCurrentlyInside = distance <= fence.radius_meters;
      const wasInside = states.get(fence.id) || false;

      if (isCurrentlyInside && !wasInside) {
        // Vehicle Entered Zone
        states.set(fence.id, true);
        const eventType = fence.zone_type === 'DELIVERY' ? 'DELIVERY_ZONE_REACHED' : 'VEHICLE_ENTERED_ZONE';
        recordGeofenceEvent(tenantId, fence.id, vehicleId, shipmentId, eventType, lat, lng, fence.name);
      } else if (!isCurrentlyInside && wasInside) {
        // Vehicle Left Zone
        states.set(fence.id, false);
        recordGeofenceEvent(tenantId, fence.id, vehicleId, shipmentId, 'VEHICLE_LEFT_ZONE', lat, lng, fence.name);
      }
    }
  } catch (err) {
    console.error('[GEOFENCE] Error evaluating geofences:', err);
  }
}

function recordGeofenceEvent(
  tenantId: string, geofenceId: string, vehicleId: string, shipmentId: string | undefined,
  eventType: string, lat: number, lng: number, fenceName: string
) {
  const eventId = uuidv4();
  db.prepare(`
    INSERT INTO geofence_events (id, tenant_id, geofence_id, vehicle_id, shipment_id, event_type, latitude, longitude, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(eventId, tenantId, geofenceId, vehicleId, shipmentId || null, eventType, lat, lng);

  const payload = {
    id: eventId,
    geofenceId,
    fenceName,
    vehicleId,
    shipmentId,
    eventType,
    latitude: lat,
    longitude: lng,
    timestamp: new Date().toISOString()
  };

  socketServer.broadcast('geofence', payload, tenantId);
  console.log(`[GEOFENCE EVENT] ${eventType}: Vehicle ${vehicleId} in ${fenceName}`);
}
