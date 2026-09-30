import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { socketServer } from '../websocket/server.js';
import { logAudit } from '../middleware/audit.js';
import { Request } from 'express';

export interface SyncItem {
  clientSyncId: string;
  entityType: 'INSPECTION' | 'DELIVERY_POD' | 'GPS_POINT' | 'SHIPMENT_STATUS' | 'BATCH_STATUS';
  operation: 'CREATE' | 'UPDATE';
  payload: any;
  clientTimestamp: string;
}

export function processSyncQueue(items: SyncItem[], req: Request, tenantId: string) {
  let synced = 0;
  let conflicts = 0;
  const results: any[] = [];

  const checkSync = db.prepare('SELECT id, status FROM sync_queue WHERE client_sync_id = ?');
  const insertSyncRecord = db.prepare(`
    INSERT INTO sync_queue (id, tenant_id, client_sync_id, entity_type, operation, payload, client_timestamp, status, conflict_resolution)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    try {
      // Deduplication check: Has this client sync transaction already been applied?
      const existing = checkSync.get(item.clientSyncId) as any;
      if (existing) {
        results.push({ clientSyncId: item.clientSyncId, status: 'ALREADY_SYNCED' });
        continue;
      }

      if (item.entityType === 'DELIVERY_POD') {
        const p = item.payload;
        // Verify shipment exists
        const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(p.shipmentId) as any;
        if (!shipment) {
          conflicts++;
          insertSyncRecord.run(uuidv4(), tenantId, item.clientSyncId, item.entityType, item.operation, JSON.stringify(p), item.clientTimestamp, 'CONFLICT', 'Shipment not found on server');
          results.push({ clientSyncId: item.clientSyncId, status: 'CONFLICT', error: 'Shipment missing' });
          continue;
        }

        // Insert delivery record
        const deliveryId = uuidv4();
        const receiptNumber = `POD-${Date.now().toString().slice(-6)}`;
        db.prepare(`
          INSERT INTO deliveries (id, receipt_number, shipment_id, order_id, tenant_id, receiver_name, receiver_signature_data, receiver_photo_url, gps_lat, gps_lng, delivered_qty_kg, damaged_qty_kg, delivery_notes, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          deliveryId, receiptNumber, p.shipmentId, shipment.order_id || p.orderId || null, tenantId,
          p.receiverName, p.receiverSignatureData, p.receiverPhotoUrl || null,
          p.gpsLat || 0, p.gpsLng || 0, p.deliveredQtyKg, p.damagedQtyKg || 0,
          p.deliveryNotes || 'Synced from offline driver device', item.clientTimestamp
        );

        // Update shipment to DELIVERED
        db.prepare(`
          UPDATE shipments SET status = 'DELIVERED', actual_arrival = ? WHERE id = ?
        `).run(item.clientTimestamp, p.shipmentId);

        // If order linked, move pipeline to DELIVERED
        if (shipment.order_id) {
          db.prepare(`
            UPDATE orders SET status = 'DELIVERED', pipeline_stage = 'DELIVERED' WHERE id = ?
          `).run(shipment.order_id);
        }

        synced++;
        insertSyncRecord.run(uuidv4(), tenantId, item.clientSyncId, item.entityType, item.operation, JSON.stringify(p), item.clientTimestamp, 'SYNCED', 'Applied clean offline POD');
        results.push({ clientSyncId: item.clientSyncId, status: 'SYNCED', receiptNumber });

        socketServer.broadcast('orders', { event: 'OFFLINE_POD_SYNCED', shipmentId: p.shipmentId, receiptNumber }, tenantId);
      } 
      else if (item.entityType === 'INSPECTION') {
        const p = item.payload;
        const inspId = uuidv4();
        db.prepare(`
          INSERT INTO quality_inspections (id, tenant_id, batch_id, inspector_id, inspection_date, product_type, visual_score, weight_kg, size_mm, moisture_pct, measured_temp_c, packaging_integrity, contamination_detected, damage_pct, conditional_notes, corrective_action, result, inspector_signature, inspector_notes, images_json, gps_lat, gps_lng)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          inspId, tenantId, p.batchId, req.user?.id || 'offline-inspector', item.clientTimestamp,
          p.productType, p.visualScore, p.weightKg, p.sizeMm, p.moisturePct, p.measuredTempC,
          p.packagingIntegrity, p.contaminationDetected ? 1 : 0, p.damagePct, p.conditionalNotes || null,
          p.correctiveAction || null, p.result, p.inspectorSignature, p.inspectorNotes,
          JSON.stringify(p.images || []), p.gpsLat || 0, p.gpsLng || 0
        );

        // Update batch status
        const newStatus = p.result === 'PASSED' ? 'APPROVED' : (p.result === 'FAILED' ? 'REJECTED' : 'INSPECTION_PENDING');
        db.prepare('UPDATE batches SET status = ? WHERE id = ?').run(newStatus, p.batchId);

        synced++;
        insertSyncRecord.run(uuidv4(), tenantId, item.clientSyncId, item.entityType, item.operation, JSON.stringify(p), item.clientTimestamp, 'SYNCED', 'Field inspection synchronized');
        results.push({ clientSyncId: item.clientSyncId, status: 'SYNCED', inspectionId: inspId });
      }
      else if (item.entityType === 'GPS_POINT') {
        const p = item.payload;
        db.prepare(`
          INSERT INTO gps_locations (id, tenant_id, shipment_id, vehicle_id, latitude, longitude, speed_kmh, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), tenantId, p.shipmentId || null, p.vehicleId, p.latitude, p.longitude, p.speedKmh || 0, item.clientTimestamp);

        synced++;
        insertSyncRecord.run(uuidv4(), tenantId, item.clientSyncId, item.entityType, item.operation, JSON.stringify(p), item.clientTimestamp, 'SYNCED', 'GPS track point stored');
        results.push({ clientSyncId: item.clientSyncId, status: 'SYNCED' });
      }
      else if (item.entityType === 'SHIPMENT_STATUS') {
        const p = item.payload;
        db.prepare('UPDATE shipments SET status = ? WHERE id = ?').run(p.status, p.shipmentId);
        synced++;
        insertSyncRecord.run(uuidv4(), tenantId, item.clientSyncId, item.entityType, item.operation, JSON.stringify(p), item.clientTimestamp, 'SYNCED', `Status updated to ${p.status}`);
        results.push({ clientSyncId: item.clientSyncId, status: 'SYNCED' });
      }
    } catch (err: any) {
      console.error('[SYNC] Error syncing item:', err);
      conflicts++;
      insertSyncRecord.run(uuidv4(), tenantId, item.clientSyncId, item.entityType, item.operation, JSON.stringify(item.payload), item.clientTimestamp, 'FAILED', err.message);
      results.push({ clientSyncId: item.clientSyncId, status: 'FAILED', error: err.message });
    }
  }

  return {
    totalItems: items.length,
    synced,
    conflicts,
    results
  };
}
