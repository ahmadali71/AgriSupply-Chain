import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { socketServer } from '../websocket/server.js';
import { evaluateGeofences } from './geofenceEngine.js';

export class IoTSimulator {
  private static instance: IoTSimulator;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private stepCount: number = 0;

  private constructor() {}

  public static getInstance(): IoTSimulator {
    if (!IoTSimulator.instance) {
      IoTSimulator.instance = new IoTSimulator();
    }
    return IoTSimulator.instance;
  }

  public start(intervalMs: number = 3000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[IoT SIMULATOR] Started telemetry simulation engine (${intervalMs}ms ticks)`);

    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[IoT SIMULATOR] Stopped telemetry simulation');
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      stepCount: this.stepCount,
      activeVehiclesSimulated: 2
    };
  }

  private tick(): void {
    this.stepCount++;
    try {
      // 1. Simulate Active In-Transit Vehicles
      const activeVehicles = db.prepare(`
        SELECT v.*, s.id as shipment_id, s.origin_lat, s.origin_lng, s.destination_lat, s.destination_lng, s.required_min_temp_c, s.required_max_temp_c
        FROM vehicles v
        LEFT JOIN shipments s ON s.vehicle_id = v.id AND s.status = 'IN_TRANSIT'
        WHERE v.status = 'IN_TRANSIT'
      `).all() as any[];

      for (const veh of activeVehicles) {
        let newLat = veh.current_lat;
        let newLng = veh.current_lng;
        let speed = +(68 + Math.random() * 18).toFixed(1);

        const stepSize = 0.0028; // ~280 meters per 3s tick = ~70 km/h realistic highway speed

        if (veh.destination_lat && veh.destination_lng) {
          const latDiff = veh.destination_lat - veh.current_lat;
          const lngDiff = veh.destination_lng - veh.current_lng;
          const distanceRemaining = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

          if (distanceRemaining > 0.008) {
            newLat += (latDiff / distanceRemaining) * stepSize;
            newLng += (lngDiff / distanceRemaining) * stepSize;
          } else {
            // Reached destination: loop back from origin to provide continuous live map demo!
            newLat = veh.origin_lat || (veh.destination_lat - 0.12);
            newLng = veh.origin_lng || (veh.destination_lng + 0.08);
          }
        } else {
          // If no destination waypoint, patrol smoothly along logistics corridor
          const angle = (this.stepCount * 0.15) % (2 * Math.PI);
          newLat += Math.sin(angle) * 0.002;
          newLng += Math.cos(angle) * 0.002;
        }

        // Temperature fluctuation with sine wave and random jitter
        const tempBase = 4.0;
        let currentTemp = +(tempBase + Math.sin(this.stepCount / 5) * 1.2 + (Math.random() * 0.4 - 0.2)).toFixed(1);

        // Every 25 steps, simulate a temporary thermal spike on vehicle 3 to showcase alert detection
        if (veh.plate_number === 'CA-9M104' && this.stepCount % 20 > 15) {
          currentTemp = +(9.8 + Math.random() * 0.5).toFixed(1); // Excursion above 9.0 threshold!
        }

        // Battery slowly depletes or stays healthy
        const batteryPct = Math.max(70, +(veh.battery_pct - 0.01).toFixed(1));

        // Update Vehicle in DB
        db.prepare(`
          UPDATE vehicles 
          SET current_lat = ?, current_lng = ?, current_speed_kmh = ?, current_temp_c = ?, battery_pct = ?
          WHERE id = ?
        `).run(newLat, newLng, speed, currentTemp, batteryPct, veh.id);

        // Record GPS history point
        db.prepare(`
          INSERT INTO gps_locations (id, tenant_id, shipment_id, vehicle_id, latitude, longitude, speed_kmh, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(uuidv4(), veh.tenant_id, veh.shipment_id || null, veh.id, newLat, newLng, speed);

        // Check attached temperature sensor
        const sensor = db.prepare(`
          SELECT * FROM sensors WHERE attached_type = 'VEHICLE' AND attached_id = ? AND sensor_type = 'TEMPERATURE'
        `).get(veh.id) as any;

        if (sensor) {
          // Update sensor current reading
          db.prepare(`
            UPDATE sensors 
            SET current_value = ?, last_heartbeat = datetime('now'),
                status = ?
            WHERE id = ?
          `).run(currentTemp, currentTemp > sensor.max_threshold ? 'WARNING' : 'ONLINE', sensor.id);

          // Save to sensor history
          db.prepare(`
            INSERT INTO sensor_readings (id, sensor_id, tenant_id, reading_type, value, timestamp)
            VALUES (?, ?, ?, 'TEMPERATURE', ?, datetime('now'))
          `).run(uuidv4(), sensor.id, veh.tenant_id, currentTemp);

          // Check for temperature excursion alert
          if (currentTemp > sensor.max_threshold) {
            this.triggerAlert(
              veh.tenant_id, sensor.id, veh.shipment_id, null, 'CRITICAL', 'TEMP_EXCURSION',
              `Reefer ${veh.plate_number} exceeded max limit: ${currentTemp}°C > ${sensor.max_threshold}°C`,
              currentTemp, sensor.max_threshold
            );
          }
        }

        // Check Geofences
        evaluateGeofences(veh.id, newLat, newLng, veh.tenant_id, veh.shipment_id);

        // Broadcast telemetry to web clients
        socketServer.broadcast('telemetry', {
          vehicleId: veh.id,
          plateNumber: veh.plate_number,
          shipmentId: veh.shipment_id,
          latitude: newLat,
          longitude: newLng,
          speedKmh: speed,
          temperatureC: currentTemp,
          batteryPct,
          timestamp: new Date().toISOString()
        }, veh.tenant_id);
      }

      // 2. Also simulate cold rooms in warehouses
      const warehouseSensors = db.prepare(`
        SELECT s.*, w.name as warehouse_name 
        FROM sensors s
        JOIN warehouses w ON w.id = s.attached_id
        WHERE s.attached_type = 'WAREHOUSE' AND s.sensor_type = 'TEMPERATURE'
      `).all() as any[];

      for (const s of warehouseSensors) {
        const coldRoomTemp = +(3.8 + (Math.random() * 0.3 - 0.15)).toFixed(1);
        db.prepare('UPDATE sensors SET current_value = ?, last_heartbeat = datetime(\'now\') WHERE id = ?').run(coldRoomTemp, s.id);

        socketServer.broadcast('telemetry', {
          sensorId: s.id,
          code: s.sensor_code,
          warehouseId: s.attached_id,
          warehouseName: s.warehouse_name,
          temperatureC: coldRoomTemp,
          timestamp: new Date().toISOString()
        }, s.tenant_id);
      }
    } catch (err) {
      console.error('[IoT SIMULATOR] Error in simulation tick:', err);
    }
  }

  public triggerAlert(
    tenantId: string, sensorId: string | null, shipmentId: string | null, warehouseId: string | null,
    severity: 'INFO' | 'WARNING' | 'CRITICAL', alertType: string, message: string,
    readingVal: number, thresholdVal: number
  ): void {
    // Avoid spamming duplicate open alerts for the same sensor within 1 minute
    const recent = db.prepare(`
      SELECT id FROM temperature_alerts 
      WHERE sensor_id = ? AND alert_type = ? AND status = 'OPEN'
      AND timestamp > datetime('now', '-1 minute')
    `).get(sensorId, alertType);

    if (recent) return;

    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO temperature_alerts (id, tenant_id, sensor_id, shipment_id, warehouse_id, severity, alert_type, message, reading_value, threshold_value, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', datetime('now'))
    `).run(alertId, tenantId, sensorId, shipmentId, warehouseId, severity, alertType, message, readingVal, thresholdVal);

    socketServer.broadcast('alerts', {
      id: alertId,
      severity,
      alertType,
      message,
      readingValue: readingVal,
      thresholdValue: thresholdVal,
      sensorId,
      shipmentId,
      warehouseId,
      timestamp: new Date().toISOString()
    }, tenantId);
  }

  // Demo action trigger for manual presentation overrides
  public triggerManualExcursion(vehiclePlate: string, tempSpike: number): any {
    const veh = db.prepare('SELECT * FROM vehicles WHERE plate_number = ?').get(vehiclePlate) as any;
    if (!veh) return { success: false, error: 'Vehicle not found' };

    db.prepare('UPDATE vehicles SET current_temp_c = ? WHERE id = ?').run(tempSpike, veh.id);

    const sensor = db.prepare('SELECT * FROM sensors WHERE attached_id = ? AND sensor_type = \'TEMPERATURE\'').get(veh.id) as any;
    if (sensor) {
      db.prepare('UPDATE sensors SET current_value = ?, status = \'CRITICAL\' WHERE id = ?').run(tempSpike, sensor.id);
      this.triggerAlert(
        veh.tenant_id, sensor.id, null, null, 'CRITICAL', 'TEMP_EXCURSION',
        `[MANUAL DEMO SPIKE] Vehicle ${vehiclePlate} reached critical temperature: ${tempSpike}°C!`,
        tempSpike, sensor.max_threshold
      );
    }
    return { success: true, plate: vehiclePlate, spikedTemp: tempSpike };
  }
}

export const iotSimulator = IoTSimulator.getInstance();
