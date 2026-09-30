import Database from 'better-sqlite3';

const db = new Database('./data/agrisupply.db');

const vCheck = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE tenant_id != ?').get('tenant-greenvalley');
console.log('Non-greenvalley vehicles count:', vCheck.count);

if (vCheck.count === 0) {
  console.log('Seeding vehicles and sensors for other tenants...');
  
  db.prepare(`
    INSERT INTO vehicles (id, tenant_id, plate_number, model, capacity_kg, is_refrigerated, min_temp_c, max_temp_c, current_lat, current_lng, current_speed_kmh, current_temp_c, fuel_pct, battery_pct, status)
    VALUES 
      ('veh-fd-01', 'tenant-freshdirect', 'OR-3H881', 'Volvo FH Electric Reefer', 22000, 1, 0.0, 6.0, 45.5152, -122.6784, 62.0, 3.4, 88.0, 94.0, 'IN_TRANSIT'),
      ('veh-fd-02', 'tenant-freshdirect', 'OR-9K120', 'Freightliner Cascadia Reefer', 25000, 1, 0.0, 5.0, 45.5231, -122.6765, 0.0, 2.8, 92.0, 99.0, 'AVAILABLE'),
      ('veh-nf-01', 'tenant-nordicfrost', 'MN-7T441', 'Scania R500 Cryo Reefer', 24000, 1, -25.0, -15.0, 44.9778, -93.2650, 58.0, -18.5, 76.0, 92.0, 'IN_TRANSIT'),
      ('veh-nf-02', 'tenant-nordicfrost', 'MN-2B909', 'Mack Anthem Reefer', 20000, 1, -25.0, -15.0, 44.9833, -93.2667, 0.0, -19.2, 85.0, 97.0, 'AVAILABLE')
  `).run();

  db.prepare(`
    INSERT INTO sensors (id, tenant_id, sensor_code, sensor_type, attached_type, attached_id, current_value, min_threshold, max_threshold, battery_pct, last_heartbeat, status)
    VALUES 
      ('sns-fd-01', 'tenant-freshdirect', 'SNS-FD-REEFER-01', 'TEMPERATURE', 'VEHICLE', 'veh-fd-01', 3.4, 0.0, 6.0, 94.0, datetime('now'), 'ONLINE'),
      ('sns-nf-01', 'tenant-nordicfrost', 'SNS-NF-CRYO-01', 'TEMPERATURE', 'VEHICLE', 'veh-nf-01', -18.5, -25.0, -15.0, 98.0, datetime('now'), 'ONLINE')
  `).run();

  console.log('Seeded multi-tenant fleet & sensors successfully.');
} else {
  console.log('Multi-tenant fleet already present.');
}
