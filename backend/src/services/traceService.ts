import db from '../db/index.js';

export interface TraceTimelineEvent {
  step: number;
  stage: string;
  title: string;
  timestamp: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  actor: string;
  details: Record<string, any>;
}

export function buildBatchTraceability(batchIdentifier: string, tenantId?: string) {
  // Can search by batch_id, batch_number, or QR data
  let query = `
    SELECT b.*, c.name as crop_name, c.variety, c.season, c.planting_date,
           f.name as farm_name, f.location as farm_location, f.latitude as farm_lat, f.longitude as farm_lng,
           f.certification, f.irrigation_type,
           fm.full_name as farmer_name, fm.phone as farmer_phone, fm.cooperative_name,
           h.harvest_date, h.yield_kg, h.weather_condition, h.notes as harvest_notes
    FROM batches b
    JOIN crops c ON c.id = b.crop_id
    JOIN farms f ON f.id = b.farm_id
    JOIN farmers fm ON fm.id = f.farmer_id
    JOIN harvests h ON h.id = b.harvest_id
    WHERE (b.id = ? OR b.batch_number = ? OR b.batch_number = ?)
  `;
  const params: any[] = [batchIdentifier, batchIdentifier, batchIdentifier.toUpperCase()];

  if (tenantId) {
    query += ' AND b.tenant_id = ?';
    params.push(tenantId);
  }

  const batch = db.prepare(query).get(...params) as any;
  if (!batch) {
    return null;
  }

  // Quality Inspection
  const inspection = db.prepare(`
    SELECT qi.*, u.full_name as inspector_name
    FROM quality_inspections qi
    JOIN users u ON u.id = qi.inspector_id
    WHERE qi.batch_id = ?
    ORDER BY qi.inspection_date DESC LIMIT 1
  `).get(batch.id) as any;

  // Shipments involving this batch
  const shipments = db.prepare(`
    SELECT s.*, v.plate_number, v.model as vehicle_model, d.full_name as driver_name, d.phone as driver_phone
    FROM shipments s
    JOIN vehicles v ON v.id = s.vehicle_id
    JOIN drivers d ON d.id = s.driver_id
    WHERE s.batch_id = ?
    ORDER BY s.created_at ASC
  `).all(batch.id) as any[];

  // Warehouse inventory & storage location
  const inventory = db.prepare(`
    SELECT inv.*, w.name as warehouse_name, w.code as warehouse_code, w.address as warehouse_address,
           w.latitude as wh_lat, w.longitude as wh_lng,
           sl.zone_name, sl.rack, sl.shelf, sl.target_temp_c, sl.target_humidity_pct
    FROM inventory inv
    JOIN warehouses w ON w.id = inv.warehouse_id
    JOIN storage_locations sl ON sl.id = inv.storage_location_id
    WHERE inv.batch_id = ? LIMIT 1
  `).get(batch.id) as any;

  // Orders linked to this batch
  const order = db.prepare(`
    SELECT o.*, r.name as retailer_name, r.contact_person, r.address as retailer_address,
           r.latitude as ret_lat, r.longitude as ret_lng
    FROM orders o
    JOIN retailers r ON r.id = o.retailer_id
    WHERE o.batch_id = ?
    ORDER BY o.created_at DESC LIMIT 1
  `).get(batch.id) as any;

  // Proof of Delivery
  let delivery: any = null;
  if (order) {
    delivery = db.prepare(`
      SELECT * FROM deliveries WHERE order_id = ? LIMIT 1
    `).get(order.id) as any;
  }

  // Invoice & Payment
  let invoice: any = null;
  let payment: any = null;
  if (order) {
    invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ? LIMIT 1').get(order.id) as any;
    if (invoice) {
      payment = db.prepare('SELECT * FROM payments WHERE invoice_id = ? LIMIT 1').get(invoice.id) as any;
    }
  }

  // Temperature readings & Alerts
  const tempAlerts = db.prepare(`
    SELECT * FROM temperature_alerts 
    WHERE (shipment_id IN (SELECT id FROM shipments WHERE batch_id = ?) OR warehouse_id = ?)
    ORDER BY timestamp DESC
  `).all(batch.id, inventory?.warehouse_id || '') as any[];

  // Construct sequential timeline
  const timeline: TraceTimelineEvent[] = [];

  // Stage 1: Cultivation & Farm
  timeline.push({
    step: 1,
    stage: 'ORIGIN',
    title: 'Farm Production & Soil Cultivation',
    timestamp: batch.planting_date,
    location: `${batch.farm_name}, ${batch.farm_location}`,
    coordinates: { lat: batch.farm_lat, lng: batch.farm_lng },
    status: 'COMPLETED',
    actor: `${batch.farmer_name} (${batch.cooperative_name || 'Grower'})`,
    details: {
      crop: batch.crop_name,
      variety: batch.variety,
      season: batch.season,
      certification: batch.certification,
      irrigation: batch.irrigation_type
    }
  });

  // Stage 2: Harvest
  timeline.push({
    step: 2,
    stage: 'HARVEST',
    title: 'Field Harvest & Batch Lot Creation',
    timestamp: batch.harvest_date,
    location: batch.farm_name,
    status: 'COMPLETED',
    actor: batch.farmer_name,
    details: {
      batchNumber: batch.batch_number,
      yieldKg: batch.yield_kg,
      weather: batch.weather_condition,
      harvestNotes: batch.harvest_notes
    }
  });

  // Stage 3: Quality Inspection
  if (inspection) {
    timeline.push({
      step: 3,
      stage: 'QUALITY_INSPECTION',
      title: `Quality Inspection: ${inspection.result}`,
      timestamp: inspection.inspection_date,
      location: batch.farm_name,
      coordinates: inspection.gps_lat ? { lat: inspection.gps_lat, lng: inspection.gps_lng } : undefined,
      status: 'COMPLETED',
      actor: `${inspection.inspector_name} (Inspector)`,
      details: {
        result: inspection.result,
        visualScore: `${inspection.visual_score}/10`,
        measuredTemp: `${inspection.measured_temp_c}°C`,
        moisture: `${inspection.moisture_pct}%`,
        packaging: inspection.packaging_integrity,
        inspectorSignature: inspection.inspector_signature,
        notes: inspection.inspector_notes
      }
    });
  }

  // Stage 4: Logistics / Inbound Shipments
  shipments.forEach((shp, idx) => {
    timeline.push({
      step: 4 + idx,
      stage: 'TRANSPORT',
      title: `Cold-Chain Transit: ${shp.origin_name} → ${shp.destination_name}`,
      timestamp: shp.departure_time || shp.created_at,
      location: `In Transit (${shp.vehicle_model} - ${shp.plate_number})`,
      coordinates: { lat: shp.origin_lat, lng: shp.origin_lng },
      status: shp.status === 'DELIVERED' ? 'COMPLETED' : 'IN_PROGRESS',
      actor: `${shp.driver_name} (CDL Driver)`,
      details: {
        shipmentNumber: shp.shipment_number,
        vehiclePlate: shp.plate_number,
        requiredTempRange: `${shp.required_min_temp_c}°C to ${shp.required_max_temp_c}°C`,
        temperatureStatus: shp.temperature_status,
        distanceKm: shp.distance_km,
        eta: shp.estimated_arrival
      }
    });
  });

  // Stage 5: Warehouse & Cold Storage
  if (inventory) {
    timeline.push({
      step: timeline.length + 1,
      stage: 'WAREHOUSE',
      title: `Cold Storage Intake: ${inventory.warehouse_name}`,
      timestamp: inventory.created_at,
      location: `${inventory.warehouse_name} (${inventory.zone_name})`,
      coordinates: { lat: inventory.wh_lat, lng: inventory.wh_lng },
      status: 'COMPLETED',
      actor: 'Warehouse Intake Team',
      details: {
        warehouseCode: inventory.warehouse_code,
        storageLocation: `${inventory.rack} / ${inventory.shelf}`,
        targetTemp: `${inventory.target_temp_c}°C`,
        targetHumidity: `${inventory.target_humidity_pct}%`,
        availableStockKg: inventory.available_qty_kg
      }
    });
  }

  // Stage 6: Retailer Order & Fulfillment
  if (order) {
    timeline.push({
      step: timeline.length + 1,
      stage: 'ORDER',
      title: `Retailer Order Placed: ${order.order_number}`,
      timestamp: order.created_at,
      location: order.delivery_address,
      coordinates: order.delivery_lat ? { lat: order.delivery_lat, lng: order.delivery_lng } : undefined,
      status: order.status === 'DELIVERED' ? 'COMPLETED' : 'IN_PROGRESS',
      actor: `${order.retailer_name} (${order.contact_person})`,
      details: {
        orderNumber: order.order_number,
        quantityKg: order.requested_qty_kg,
        totalAmount: `$${order.total_amount.toFixed(2)}`,
        pipelineStage: order.pipeline_stage,
        requiredDate: order.required_delivery_date
      }
    });
  }

  // Stage 7: Final Delivery & POD
  if (delivery) {
    timeline.push({
      step: timeline.length + 1,
      stage: 'DELIVERY',
      title: `Digital Proof of Delivery: ${delivery.receipt_number}`,
      timestamp: delivery.timestamp,
      location: order?.delivery_address || 'Customer Premises',
      coordinates: { lat: delivery.gps_lat, lng: delivery.gps_lng },
      status: 'COMPLETED',
      actor: delivery.receiver_name,
      details: {
        receiptNumber: delivery.receipt_number,
        deliveredKg: delivery.delivered_qty_kg,
        damagedKg: delivery.damaged_qty_kg,
        signatureCaptured: true,
        notes: delivery.delivery_notes
      }
    });
  }

  // Stage 8: Financial Settlement
  if (invoice) {
    timeline.push({
      step: timeline.length + 1,
      stage: 'FINANCE',
      title: `Financial Settlement: Invoice ${invoice.invoice_number}`,
      timestamp: invoice.issued_date,
      location: 'Accounting Ledger',
      status: invoice.status === 'PAID' ? 'COMPLETED' : 'IN_PROGRESS',
      actor: 'Finance Department',
      details: {
        invoiceNumber: invoice.invoice_number,
        netPayable: `$${invoice.net_payable.toFixed(2)}`,
        status: invoice.status,
        paymentReference: payment?.transaction_reference || 'Pending settlement'
      }
    });
  }

  return {
    batch,
    inspection,
    inventory,
    shipments,
    order,
    delivery,
    invoice,
    payment,
    alerts: tempAlerts,
    timeline
  };
}
