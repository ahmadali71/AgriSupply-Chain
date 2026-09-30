import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from './index.js';
import { USER_ROLES, DEFAULT_PERMISSIONS } from '../config/constants.js';

export async function runSeed() {
  console.log('[SEED] Initializing database schema...');
  initDatabase();

  const existingTenant = db.prepare('SELECT id FROM tenants LIMIT 1').get();
  if (existingTenant) {
    console.log('[SEED] Database already contains data. Clearing tables for fresh seed...');
    const tables = [
      'sync_queue', 'audit_logs', 'documents', 'expenses', 'payments', 'invoices',
      'deliveries', 'temperature_alerts', 'sensor_readings', 'sensors', 'geofence_events',
      'geofences', 'gps_locations', 'shipment_stops', 'shipments', 'orders', 'retailers',
      'drivers', 'vehicles', 'inventory_transactions', 'inventory', 'storage_locations',
      'warehouses', 'quality_inspections', 'batches', 'harvests', 'crops', 'farms',
      'farmers', 'roles_permissions', 'users', 'tenants'
    ];
    for (const t of tables) {
      try { db.exec(`DELETE FROM ${t};`); } catch (e) { /* ignore */ }
    }
  }

  console.log('[SEED] Seeding roles and permissions...');
  const insertRole = db.prepare(`
    INSERT INTO roles_permissions (role, description, permissions_json)
    VALUES (?, ?, ?)
  `);
  for (const [role, perms] of Object.entries(DEFAULT_PERMISSIONS)) {
    insertRole.run(role, `Role definition for ${role}`, JSON.stringify(perms));
  }

  console.log('[SEED] Seeding Tenants...');
  const insertTenant = db.prepare(`
    INSERT INTO tenants (id, name, slug, plan, status, contact_email, contact_phone, settings_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const t1 = 'tenant-greenvalley';
  const t2 = 'tenant-freshdirect';
  const t3 = 'tenant-nordicfrost';

  insertTenant.run(t1, 'GreenValley Agro Logistics', 'greenvalley', 'ENTERPRISE', 'ACTIVE', 'contact@greenvalley.com', '+1-555-0100', JSON.stringify({ currency: 'USD', tempUnit: 'C', timezone: 'America/Los_Angeles' }));
  insertTenant.run(t2, 'FreshDirect Highlands Co.', 'freshdirect', 'PROFESSIONAL', 'ACTIVE', 'contact@freshdirect.com', '+1-555-0200', JSON.stringify({ currency: 'USD', tempUnit: 'C', timezone: 'America/Denver' }));
  insertTenant.run(t3, 'Nordic Frost Sub-Zero Logistics', 'nordicfrost', 'ENTERPRISE', 'ACTIVE', 'contact@nordicfrost.com', '+1-555-0300', JSON.stringify({ currency: 'EUR', tempUnit: 'C', timezone: 'Europe/Stockholm' }));

  console.log('[SEED] Seeding Users with bcrypt hashing...');
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (id, tenant_id, email, password_hash, role, full_name, phone, status, two_factor_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `);

  const users = [
    { id: 'usr-superadmin', t: t1, email: 'admin@agrisupply.com', role: USER_ROLES.SUPER_ADMIN, name: 'Arthur Vance (Super Admin)', phone: '+1-555-1000' },
    { id: 'usr-tenantadmin', t: t1, email: 'tenantadmin@greenvalley.com', role: USER_ROLES.TENANT_ADMIN, name: 'Eleanor Sterling', phone: '+1-555-1001' },
    { id: 'usr-farmer', t: t1, email: 'farmer.john@greenvalley.com', role: USER_ROLES.FARMER, name: 'John Martinez', phone: '+1-555-1002' },
    { id: 'usr-farmmgr', t: t1, email: 'farmmgr.sarah@greenvalley.com', role: USER_ROLES.FARM_MANAGER, name: 'Sarah Jenkins', phone: '+1-555-1003' },
    { id: 'usr-inspector', t: t1, email: 'inspector.alex@greenvalley.com', role: USER_ROLES.QUALITY_INSPECTOR, name: 'Alex Wong', phone: '+1-555-1004' },
    { id: 'usr-transportmgr', t: t1, email: 'transport.david@greenvalley.com', role: USER_ROLES.TRANSPORT_MANAGER, name: 'David Miller', phone: '+1-555-1005' },
    { id: 'usr-driver1', t: t1, email: 'driver.mike@greenvalley.com', role: USER_ROLES.DRIVER, name: 'Mike Ross', phone: '+1-555-1006' },
    { id: 'usr-driver2', t: t1, email: 'driver.carlos@greenvalley.com', role: USER_ROLES.DRIVER, name: 'Carlos Diaz', phone: '+1-555-1007' },
    { id: 'usr-warehousemgr', t: t1, email: 'warehouse.lisa@greenvalley.com', role: USER_ROLES.WAREHOUSE_MANAGER, name: 'Lisa Chen', phone: '+1-555-1008' },
    { id: 'usr-retailer', t: t1, email: 'retailer.metro@freshmart.com', role: USER_ROLES.RETAILER, name: 'Marcus Brody', phone: '+1-555-1009' },
    { id: 'usr-finance', t: t1, email: 'finance.rachel@greenvalley.com', role: USER_ROLES.FINANCE_OFFICER, name: 'Rachel Green', phone: '+1-555-1010' },
    // Tenant 2 & 3 users for multi-tenant isolation testing
    { id: 'usr-t2-admin', t: t2, email: 'admin@freshdirect.com', role: USER_ROLES.TENANT_ADMIN, name: 'Brian O\'Connor', phone: '+1-555-2001' },
    { id: 'usr-t3-admin', t: t3, email: 'admin@nordicfrost.com', role: USER_ROLES.TENANT_ADMIN, name: 'Astrid Lindgren', phone: '+46-8-555-3001' }
  ];

  for (const u of users) {
    insertUser.run(u.id, u.t, u.email, passwordHash, u.role, u.name, u.phone, 0);
  }

  console.log('[SEED] Seeding Farmers...');
  const insertFarmer = db.prepare(`
    INSERT INTO farmers (id, tenant_id, user_id, full_name, phone, national_id, address, experience_years, cooperative_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const farmers = [
    { id: 'frm-001', t: t1, uid: 'usr-farmer', name: 'John Martinez', phone: '+1-555-1002', nid: 'ID-884920', addr: '104 Salinas River Rd, Salinas, CA', exp: 16, coop: 'Salinas Valley Organic Growers' },
    { id: 'frm-002', t: t1, uid: null, name: 'Mateo Hernandez', phone: '+1-555-1102', nid: 'ID-339281', addr: '512 Watsonville Way, Watsonville, CA', exp: 12, coop: 'Pacific Berry Producers Co-op' },
    { id: 'frm-003', t: t1, uid: null, name: 'Brenda Lawson', phone: '+1-555-1103', nid: 'ID-992014', addr: '88 Ojai Foothill Blvd, Ojai, CA', exp: 20, coop: 'Southern Coast Citrus Alliance' },
    { id: 'frm-004', t: t1, uid: null, name: 'Samuel Kim', phone: '+1-555-1104', nid: 'ID-550192', addr: '233 Santa Maria Vista, Santa Maria, CA', exp: 9, coop: 'Central Coast Greens Federation' },
    { id: 'frm-005', t: t2, uid: null, name: 'Lars Thorne', phone: '+1-555-2201', nid: 'ID-100482', addr: '94 Highland Plateau, Boulder, CO', exp: 14, coop: 'Rockies High Altitude Farming' }
  ];

  for (const f of farmers) {
    insertFarmer.run(f.id, f.t, f.uid, f.name, f.phone, f.nid, f.addr, f.exp, f.coop);
  }

  console.log('[SEED] Seeding 20+ Farms...');
  const insertFarm = db.prepare(`
    INSERT INTO farms (id, tenant_id, farmer_id, name, location, latitude, longitude, size_acres, crop_types, capacity_tons, irrigation_type, certification, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const farmData = [
    { id: 'farm-01', t: t1, fid: 'frm-001', name: 'Valley Green Organic Farm', loc: 'Salinas Valley, CA', lat: 36.6777, lng: -121.6555, size: 280, crops: 'Roma Tomatoes, Romaine Lettuce', cap: 650, irri: 'DRIP', cert: 'USDA_ORGANIC', phone: '+1-555-7001' },
    { id: 'farm-02', t: t1, fid: 'frm-002', name: 'Highland Berry Ranch', loc: 'Watsonville, CA', lat: 36.9102, lng: -121.7569, size: 140, crops: 'Strawberries, Blackberries', cap: 320, irri: 'MICRO_SPRINKLER', cert: 'GLOBAL_GAP', phone: '+1-555-7002' },
    { id: 'farm-03', t: t1, fid: 'frm-003', name: 'Sunburst Citrus Groves', loc: 'Ojai Valley, CA', lat: 34.4480, lng: -119.2429, size: 350, crops: 'Valencia Oranges, Meyer Lemons', cap: 900, irri: 'DRIP', cert: 'FAIR_TRADE', phone: '+1-555-7003' },
    { id: 'farm-04', t: t1, fid: 'frm-004', name: 'Emerald Leaf Organic Fields', loc: 'Santa Maria, CA', lat: 34.9530, lng: -120.4357, size: 210, crops: 'Baby Spinach, Kale, Broccoli', cap: 480, irri: 'DRIP', cert: 'USDA_ORGANIC', phone: '+1-555-7004' },
    { id: 'farm-05', t: t1, fid: 'frm-001', name: 'Golden Harvest Orchards', loc: 'Fresno Country, CA', lat: 36.7468, lng: -119.7726, size: 400, crops: 'Hass Avocados, Peaches', cap: 1200, irri: 'SUBSURFACE_DRIP', cert: 'GLOBAL_GAP', phone: '+1-555-7005' },
    { id: 'farm-06', t: t1, fid: 'frm-002', name: 'Pacific Blue Orchards', loc: 'Monterey County, CA', lat: 36.6002, lng: -121.8947, size: 160, crops: 'Blueberries, Raspberries', cap: 340, irri: 'DRIP', cert: 'USDA_ORGANIC', phone: '+1-555-7006' },
    { id: 'farm-07', t: t1, fid: 'frm-003', name: 'Cuyama Valley Carrot Estates', loc: 'New Cuyama, CA', lat: 34.9489, lng: -119.6876, size: 500, crops: 'Organic Carrots, Parsnips', cap: 1500, irri: 'PIVOT_SPRINKLER', cert: 'USDA_ORGANIC', phone: '+1-555-7007' },
    { id: 'farm-08', t: t1, fid: 'frm-004', name: 'Napa Valley Artisan Vineyards', loc: 'St. Helena, CA', lat: 38.5052, lng: -122.4704, size: 180, crops: 'Table Grapes, Organic Figs', cap: 410, irri: 'DRIP', cert: 'BIODYNAMIC', phone: '+1-555-7008' },
    { id: 'farm-09', t: t1, fid: 'frm-001', name: 'Coachella Valley Date Palms', loc: 'Indio, CA', lat: 33.7206, lng: -116.2156, size: 220, crops: 'Medjool Dates, Bell Peppers', cap: 520, irri: 'FLOOD_DRIP_HYBRID', cert: 'FAIR_TRADE', phone: '+1-555-7009' },
    { id: 'farm-10', t: t1, fid: 'frm-002', name: 'San Joaquin Almond Groves', loc: 'Modesto, CA', lat: 37.6391, lng: -120.9969, size: 600, crops: 'Almonds, Walnuts', cap: 1800, irri: 'DRIP', cert: 'GLOBAL_GAP', phone: '+1-555-7010' },
    { id: 'farm-11', t: t1, fid: 'frm-003', name: 'Sonoma Greenery Farm', loc: 'Petaluma, CA', lat: 38.2324, lng: -122.6367, size: 130, crops: 'Hydroponic Herbs, Microgreens', cap: 210, irri: 'HYDROPONIC', cert: 'USDA_ORGANIC', phone: '+1-555-7011' },
    { id: 'farm-12', t: t1, fid: 'frm-004', name: 'Bakersfield Sweet Corn Fields', loc: 'Bakersfield, CA', lat: 35.3733, lng: -119.0187, size: 450, crops: 'Sweet Corn, Melons', cap: 1400, irri: 'SPRINKLER', cert: 'GAP_CERTIFIED', phone: '+1-555-7012' },
    { id: 'farm-13', t: t1, fid: 'frm-001', name: 'Imperial Valley Produce Acres', loc: 'El Centro, CA', lat: 32.7920, lng: -115.5631, size: 700, crops: 'Cabbage, Onions, Garlic', cap: 2200, irri: 'FURROW_MODERN', cert: 'GLOBAL_GAP', phone: '+1-555-7013' },
    { id: 'farm-14', t: t1, fid: 'frm-002', name: 'Sacramento Delta Pear Orchards', loc: 'Courtland, CA', lat: 38.3307, lng: -121.5694, size: 250, crops: 'Bartlett Pears, Asian Pears', cap: 780, irri: 'MICRO_SPRINKLER', cert: 'USDA_ORGANIC', phone: '+1-555-7014' },
    { id: 'farm-15', t: t1, fid: 'frm-003', name: 'Ventura Coastal Celery Basin', loc: 'Oxnard, CA', lat: 34.1975, lng: -119.1771, size: 310, crops: 'Celery, Strawberries, Cilantro', cap: 890, irri: 'DRIP', cert: 'GLOBAL_GAP', phone: '+1-555-7015' },
    { id: 'farm-16', t: t1, fid: 'frm-004', name: 'Capay Valley Heirloom Garden', loc: 'Esparto, CA', lat: 38.6924, lng: -122.0189, size: 95, crops: 'Heirloom Tomatoes, Squash', cap: 190, irri: 'DRIP', cert: 'USDA_ORGANIC', phone: '+1-555-7016' },
    { id: 'farm-17', t: t1, fid: 'frm-001', name: 'San Luis Obispo Apple Haven', loc: 'See Canyon, CA', lat: 35.1953, lng: -120.7388, size: 110, crops: 'Honeycrisp Apples, Fuji Apples', cap: 310, irri: 'DRIP', cert: 'USDA_ORGANIC', phone: '+1-555-7017' },
    { id: 'farm-18', t: t1, fid: 'frm-002', name: 'Gilroy Garlic & Pepper Farm', loc: 'Gilroy, CA', lat: 37.0058, lng: -121.5683, size: 290, crops: 'Garlic, Jalapeno Peppers', cap: 750, irri: 'DRIP', cert: 'GLOBAL_GAP', phone: '+1-555-7018' },
    { id: 'farm-19', t: t1, fid: 'frm-003', name: 'Central Coast Artichoke Ranch', loc: 'Castroville, CA', lat: 36.7658, lng: -121.7580, size: 340, crops: 'Globe Artichokes, Brussels Sprouts', cap: 820, irri: 'DRIP', cert: 'GLOBAL_GAP', phone: '+1-555-7019' },
    { id: 'farm-20', t: t1, fid: 'frm-004', name: 'Santa Ynez Valley Olive Orchards', loc: 'Los Olivos, CA', lat: 34.6644, lng: -120.1174, size: 175, crops: 'Mission Olives, Lavender', cap: 280, irri: 'DRIP', cert: 'USDA_ORGANIC', phone: '+1-555-7020' },
    // Tenant 2 farms
    { id: 'farm-21', t: t2, fid: 'frm-005', name: 'Rocky Mountain Alpine Apples', loc: 'Boulder Valley, CO', lat: 40.0150, lng: -105.2705, size: 210, crops: 'Honeycrisp Apples', cap: 450, irri: 'DRIP', cert: 'ORGANIC', phone: '+1-555-7021' }
  ];

  for (const f of farmData) {
    insertFarm.run(f.id, f.t, f.fid, f.name, f.loc, f.lat, f.lng, f.size, f.crops, f.cap, f.irri, f.cert, f.phone);
  }

  console.log('[SEED] Seeding Crops and Harvests...');
  const insertCrop = db.prepare(`
    INSERT INTO crops (id, tenant_id, farm_id, name, variety, season, planting_date, expected_harvest_date, estimated_qty_kg, actual_qty_kg, quality_grade, lifecycle_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const crops = [
    { id: 'crp-01', t: t1, fid: 'farm-01', name: 'Roma Tomatoes', var: 'San Marzano Hybrid', season: 'Summer 2026', plant: '2026-04-15', expHarvest: '2026-08-20', estKg: 25000, actKg: 24200, grade: 'GRADE_A', status: 'HARVESTED' },
    { id: 'crp-02', t: t1, fid: 'farm-02', name: 'Organic Strawberries', var: 'Albion Premium', season: 'Spring/Summer 2026', plant: '2026-03-01', expHarvest: '2026-07-15', estKg: 12000, actKg: 11800, grade: 'GRADE_A', status: 'HARVESTED' },
    { id: 'crp-03', t: t1, fid: 'farm-03', name: 'Valencia Oranges', var: 'Midnight Seedless', season: 'Summer 2026', plant: '2025-11-10', expHarvest: '2026-09-01', estKg: 40000, actKg: 39500, grade: 'GRADE_A', status: 'HARVESTED' },
    { id: 'crp-04', t: t1, fid: 'farm-04', name: 'Crisp Romaine Lettuce', var: 'Green Towers', season: 'Fall 2026', plant: '2026-07-10', expHarvest: '2026-10-05', estKg: 18000, actKg: 0, grade: 'GRADE_A', status: 'GROWING' },
    { id: 'crp-05', t: t1, fid: 'farm-05', name: 'Hass Avocados', var: 'Premium Dark Skin', season: 'Summer 2026', plant: '2025-08-20', expHarvest: '2026-08-28', estKg: 32000, actKg: 31400, grade: 'GRADE_A', status: 'HARVESTED' }
  ];

  for (const c of crops) {
    insertCrop.run(c.id, c.t, c.fid, c.name, c.var, c.season, c.plant, c.expHarvest, c.estKg, c.actKg, c.grade, c.status);
  }

  const insertHarvest = db.prepare(`
    INSERT INTO harvests (id, tenant_id, crop_id, farm_id, harvest_date, yield_kg, grade, weather_condition, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const harvests = [
    { id: 'hrv-01', t: t1, cid: 'crp-01', fid: 'farm-01', date: '2026-08-22', yield: 24200, grade: 'GRADE_A', weather: 'Dry, 22C, Moderate Breeze', notes: 'Excellent firm fruit, optimal brix ratio' },
    { id: 'hrv-02', t: t1, cid: 'crp-02', fid: 'farm-02', date: '2026-07-18', yield: 11800, grade: 'GRADE_A', weather: 'Overcast, 18C, High Humidity', notes: 'Immediate cold pre-cooling applied at 2C' },
    { id: 'hrv-03', t: t1, cid: 'crp-03', fid: 'farm-03', date: '2026-09-03', yield: 39500, grade: 'GRADE_A', weather: 'Sunny, 28C, Dry', notes: 'High juice content, uniform size' },
    { id: 'hrv-04', t: t1, cid: 'crp-05', fid: 'farm-05', date: '2026-08-30', yield: 31400, grade: 'GRADE_A', weather: 'Clear, 25C', notes: 'Optimal dry matter content 24%' }
  ];

  for (const h of harvests) {
    insertHarvest.run(h.id, h.t, h.cid, h.fid, h.date, h.yield, h.grade, h.weather, h.notes);
  }

  console.log('[SEED] Seeding Batches with unique barcodes/QR...');
  const insertBatch = db.prepare(`
    INSERT INTO batches (id, batch_number, tenant_id, crop_id, farm_id, harvest_id, product_name, quantity_kg, available_kg, unit, quality_grade, harvest_date, expiry_date, storage_type, min_temp_c, max_temp_c, current_location, status, qr_code_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batches = [
    { id: 'bat-001', num: 'BATCH-2026-TOM-000101', t: t1, cid: 'crp-01', fid: 'farm-01', hid: 'hrv-01', prod: 'Roma Tomatoes Grade A', qty: 5000, avail: 1200, u: 'KG', grade: 'GRADE_A', hdate: '2026-08-22', edate: '2026-10-15', stype: 'COLD_STORAGE', minT: 2.0, maxT: 8.0, loc: 'CENTRAL_ALPHA_COLD_ROOM_1', status: 'IN_WAREHOUSE' },
    { id: 'bat-002', num: 'BATCH-2026-STR-000204', t: t1, cid: 'crp-02', fid: 'farm-02', hid: 'hrv-02', prod: 'Organic Strawberries', qty: 3500, avail: 500, u: 'KG', grade: 'GRADE_A', hdate: '2026-07-18', edate: '2026-08-15', stype: 'COLD_STORAGE', minT: 0.5, maxT: 4.0, loc: 'CENTRAL_ALPHA_COLD_ROOM_2', status: 'DELIVERED' },
    { id: 'bat-003', num: 'BATCH-2026-CIT-000305', t: t1, cid: 'crp-03', fid: 'farm-03', hid: 'hrv-03', prod: 'Valencia Oranges', qty: 8000, avail: 8000, u: 'KG', grade: 'GRADE_A', hdate: '2026-09-03', edate: '2026-11-30', stype: 'CONTROLLED_ATMOSPHERE', minT: 4.0, maxT: 9.0, loc: 'TRUCK_CA-7K921', status: 'IN_TRANSIT' },
    { id: 'bat-004', num: 'BATCH-2026-AVO-000412', t: t1, cid: 'crp-05', fid: 'farm-05', hid: 'hrv-04', prod: 'Hass Avocados', qty: 6000, avail: 6000, u: 'KG', grade: 'GRADE_A', hdate: '2026-08-30', edate: '2026-10-20', stype: 'COLD_STORAGE', minT: 4.0, maxT: 7.0, loc: 'FARM_GATE', status: 'INSPECTION_PENDING' },
    { id: 'bat-005', num: 'BATCH-2026-TOM-000523', t: t1, cid: 'crp-01', fid: 'farm-01', hid: 'hrv-01', prod: 'Roma Tomatoes Grade B', qty: 4000, avail: 4000, u: 'KG', grade: 'GRADE_B', hdate: '2026-08-22', edate: '2026-10-10', stype: 'COLD_STORAGE', minT: 2.0, maxT: 8.0, loc: 'FARM_GATE', status: 'APPROVED' }
  ];

  for (const b of batches) {
    const qrPayload = JSON.stringify({ batchNumber: b.num, product: b.prod, tenant: b.t, harvestDate: b.hdate, expiryDate: b.edate });
    insertBatch.run(b.id, b.num, b.t, b.cid, b.fid, b.hid, b.prod, b.qty, b.avail, b.u, b.grade, b.hdate, b.edate, b.stype, b.minT, b.maxT, b.loc, b.status, qrPayload);
  }

  console.log('[SEED] Seeding Quality Inspections...');
  const insertInspection = db.prepare(`
    INSERT INTO quality_inspections (id, tenant_id, batch_id, inspector_id, inspection_date, product_type, visual_score, weight_kg, size_mm, moisture_pct, measured_temp_c, packaging_integrity, contamination_detected, damage_pct, conditional_notes, corrective_action, result, inspector_signature, inspector_notes, images_json, gps_lat, gps_lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inspections = [
    {
      id: 'insp-001', t: t1, bid: 'bat-001', iid: 'usr-inspector', date: '2026-08-23 10:15:00', type: 'VEGETABLES',
      vis: 9.6, wt: 5000, sz: 68.5, moist: 91.2, temp: 4.2, pack: 'INTACT_VENTILATED', contam: 0, dmg: 0.8,
      cnotes: null, correc: null, res: 'PASSED', sig: 'Alex Wong (Certified Lead Inspector #Q-991)',
      notes: 'Excellent color uniformity, skin tension is crisp. Permitted for cold transport.',
      imgs: JSON.stringify(['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop']),
      lat: 36.6778, lng: -121.6554
    },
    {
      id: 'insp-002', t: t1, bid: 'bat-002', iid: 'usr-inspector', date: '2026-07-19 09:30:00', type: 'BERRIES',
      vis: 9.8, wt: 3500, sz: 32.0, moist: 88.4, temp: 2.1, pack: 'CLAMSHELL_PUNCHED', contam: 0, dmg: 0.2,
      cnotes: null, correc: null, res: 'PASSED', sig: 'Alex Wong (Certified Lead Inspector #Q-991)',
      notes: 'Superb berry firmness and sugar content. Quick chill validated.',
      imgs: JSON.stringify(['https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&auto=format&fit=crop']),
      lat: 36.9103, lng: -121.7570
    },
    {
      id: 'insp-003', t: t1, bid: 'bat-003', iid: 'usr-inspector', date: '2026-09-04 11:00:00', type: 'CITRUS',
      vis: 9.1, wt: 8000, sz: 75.0, moist: 86.0, temp: 5.5, pack: 'CORRUGATED_WOOD_BIN', contam: 0, dmg: 1.2,
      cnotes: null, correc: null, res: 'PASSED', sig: 'Alex Wong (Certified Lead Inspector #Q-991)',
      notes: 'Pectin and brix within top tier commercial thresholds.',
      imgs: JSON.stringify(['https://images.unsplash.com/photo-1557800636-894a64c1696f?w=600&auto=format&fit=crop']),
      lat: 34.4481, lng: -119.2430
    }
  ];

  for (const i of inspections) {
    insertInspection.run(i.id, i.t, i.bid, i.iid, i.date, i.type, i.vis, i.wt, i.sz, i.moist, i.temp, i.pack, i.contam, i.dmg, i.cnotes, i.correc, i.res, i.sig, i.notes, i.imgs, i.lat, i.lng);
  }

  console.log('[SEED] Seeding 5+ Warehouses...');
  const insertWarehouse = db.prepare(`
    INSERT INTO warehouses (id, tenant_id, name, code, address, latitude, longitude, total_capacity_sqft, total_cold_rooms, active_alerts_count, manager_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const warehouses = [
    { id: 'wh-01', t: t1, name: 'Central Cold Hub Alpha', code: 'WH-OAK-01', addr: '820 Maritime St, Oakland, CA', lat: 37.8044, lng: -122.2712, sqft: 75000, rooms: 6, alerts: 1, mgr: 'usr-warehousemgr' },
    { id: 'wh-02', t: t1, name: 'Pacific Gateway Cold Storage', code: 'WH-LGB-02', addr: '1100 Pier F Ave, Long Beach, CA', lat: 33.7701, lng: -118.1937, sqft: 90000, rooms: 8, alerts: 0, mgr: null },
    { id: 'wh-03', t: t1, name: 'Central Valley Agro Depot', code: 'WH-FRS-03', addr: '3400 E Central Ave, Fresno, CA', lat: 36.7012, lng: -119.7422, sqft: 110000, rooms: 10, alerts: 0, mgr: null },
    { id: 'wh-04', t: t1, name: 'Silicon Valley Produce Terminal', code: 'WH-SJC-04', addr: '750 Commercial St, San Jose, CA', lat: 37.3688, lng: -121.8906, sqft: 50000, rooms: 4, alerts: 0, mgr: null },
    { id: 'wh-05', t: t1, name: 'Sacramento Delta Cold Center', code: 'WH-SAC-05', addr: '1800 Terminal St, West Sacramento, CA', lat: 38.5816, lng: -121.5302, sqft: 65000, rooms: 5, alerts: 0, mgr: null }
  ];

  for (const w of warehouses) {
    insertWarehouse.run(w.id, w.t, w.name, w.code, w.addr, w.lat, w.lng, w.sqft, w.rooms, w.alerts, w.mgr, 'ACTIVE');
  }

  console.log('[SEED] Seeding Storage Locations and Zones...');
  const insertLocation = db.prepare(`
    INSERT INTO storage_locations (id, tenant_id, warehouse_id, zone_name, rack, shelf, cold_room_id, is_cold_storage, capacity_kg, current_occupancy_kg, target_temp_c, target_humidity_pct, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const locations = [
    { id: 'loc-01', t: t1, wid: 'wh-01', zone: 'Zone A - Fresh Produce', rack: 'RACK-01', shelf: 'SHELF-A', cr: 'CR-ALPHA-01', cold: 1, cap: 20000, occ: 3800, temp: 4.0, hum: 88.0, stat: 'OPTIMAL' },
    { id: 'loc-02', t: t1, wid: 'wh-01', zone: 'Zone A - Fresh Produce', rack: 'RACK-02', shelf: 'SHELF-B', cr: 'CR-ALPHA-01', cold: 1, cap: 20000, occ: 1200, temp: 3.8, hum: 85.0, stat: 'OPTIMAL' },
    { id: 'loc-03', t: t1, wid: 'wh-01', zone: 'Zone B - Deep Chilled Berries', rack: 'RACK-03', shelf: 'SHELF-A', cr: 'CR-ALPHA-02', cold: 1, cap: 15000, occ: 500, temp: 1.5, hum: 92.0, stat: 'OPTIMAL' },
    { id: 'loc-04', t: t1, wid: 'wh-02', zone: 'Zone Port Bulk', rack: 'RACK-01', shelf: 'SHELF-A', cr: 'CR-BETA-01', cold: 1, cap: 35000, occ: 8000, temp: 5.0, hum: 80.0, stat: 'OPTIMAL' },
    { id: 'loc-05', t: t1, wid: 'wh-03', zone: 'Zone Citrus & Tree Fruit', rack: 'RACK-01', shelf: 'SHELF-A', cr: 'CR-CV-01', cold: 1, cap: 40000, occ: 12000, temp: 6.0, hum: 82.0, stat: 'OPTIMAL' }
  ];

  for (const l of locations) {
    insertLocation.run(l.id, l.t, l.wid, l.zone, l.rack, l.shelf, l.cr, l.cold, l.cap, l.occ, l.temp, l.hum, l.stat);
  }

  console.log('[SEED] Seeding Inventory...');
  const insertInventory = db.prepare(`
    INSERT INTO inventory (id, tenant_id, warehouse_id, storage_location_id, batch_id, product_name, available_qty_kg, reserved_qty_kg, damaged_qty_kg, unit, expiry_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inventoryItems = [
    { id: 'inv-01', t: t1, wid: 'wh-01', lid: 'loc-01', bid: 'bat-001', prod: 'Roma Tomatoes Grade A', avail: 1200, res: 2600, dmg: 0, u: 'KG', exp: '2026-10-15', stat: 'IN_STORAGE' },
    { id: 'inv-02', t: t1, wid: 'wh-01', lid: 'loc-03', bid: 'bat-002', prod: 'Organic Strawberries', avail: 500, res: 0, dmg: 0, u: 'KG', exp: '2026-08-15', stat: 'IN_STORAGE' }
  ];

  for (const inv of inventoryItems) {
    insertInventory.run(inv.id, inv.t, inv.wid, inv.lid, inv.bid, inv.prod, inv.avail, inv.res, inv.dmg, inv.u, inv.exp, inv.stat);
  }

  console.log('[SEED] Seeding Vehicles & Drivers...');
  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (id, tenant_id, plate_number, model, capacity_kg, is_refrigerated, min_temp_c, max_temp_c, current_lat, current_lng, current_speed_kmh, current_temp_c, fuel_pct, battery_pct, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const vehicles = [
    { id: 'veh-01', t: t1, plate: 'CA-7K921', model: 'Freightliner Cascadia eReefer 2026', cap: 18000, cold: 1, minT: 1.0, maxT: 8.0, lat: 36.8500, lng: -120.7200, spd: 88, temp: 4.8, fuel: 82, bat: 94, stat: 'IN_TRANSIT' },
    { id: 'veh-02', t: t1, plate: 'CA-8X442', model: 'Kenworth T680 ThermoKing Aero', cap: 22000, cold: 1, minT: -20.0, maxT: 4.0, lat: 37.8044, lng: -122.2712, spd: 0, temp: -18.2, fuel: 95, bat: 100, stat: 'AVAILABLE' },
    { id: 'veh-03', t: t1, plate: 'CA-9M104', model: 'Volvo VNL 760 Smart Carrier Reefer', cap: 20000, cold: 1, minT: 2.0, maxT: 10.0, lat: 34.4480, lng: -119.2429, spd: 45, temp: 5.2, fuel: 76, bat: 89, stat: 'IN_TRANSIT' },
    { id: 'veh-04', t: t1, plate: 'CA-4P551', model: 'Isuzu NPR-HD Urban ColdBox', cap: 6000, cold: 1, minT: 0.0, maxT: 6.0, lat: 37.3688, lng: -121.8906, spd: 0, temp: 3.5, fuel: 90, bat: 98, stat: 'AVAILABLE' }
  ];

  for (const v of vehicles) {
    insertVehicle.run(v.id, v.t, v.plate, v.model, v.cap, v.cold, v.minT, v.maxT, v.lat, v.lng, v.spd, v.temp, v.fuel, v.bat, v.stat);
  }

  const insertDriver = db.prepare(`
    INSERT INTO drivers (id, tenant_id, user_id, full_name, license_number, phone, status, current_vehicle_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const drivers = [
    { id: 'drv-01', t: t1, uid: 'usr-driver1', name: 'Mike Ross', lic: 'CDL-CA-992019', phone: '+1-555-1006', stat: 'ON_TRIP', veh: 'veh-01' },
    { id: 'drv-02', t: t1, uid: 'usr-driver2', name: 'Carlos Diaz', lic: 'CDL-CA-448210', phone: '+1-555-1007', stat: 'ON_TRIP', veh: 'veh-03' },
    { id: 'drv-03', t: t1, uid: null, name: 'Angela Peterson', lic: 'CDL-CA-112098', phone: '+1-555-1022', stat: 'AVAILABLE', veh: 'veh-02' }
  ];

  for (const d of drivers) {
    insertDriver.run(d.id, d.t, d.uid, d.name, d.lic, d.phone, d.stat, d.veh);
  }

  console.log('[SEED] Seeding Retailers and Orders...');
  const insertRetailer = db.prepare(`
    INSERT INTO retailers (id, tenant_id, name, contact_person, email, phone, address, latitude, longitude, tax_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const retailers = [
    { id: 'ret-01', t: t1, name: 'Metro Fresh Supermarkets Inc.', cp: 'Marcus Brody', email: 'retailer.metro@freshmart.com', phone: '+1-555-1009', addr: '2000 Market St, San Francisco, CA', lat: 37.7699, lng: -122.4271, tax: 'TX-94103-A' },
    { id: 'ret-02', t: t1, name: 'WholeEarth Organic Grocers', cp: 'Clara Oswald', email: 'orders@wholeearth.com', phone: '+1-555-3001', addr: '415 14th St, Oakland, CA', lat: 37.8040, lng: -122.2700, tax: 'TX-94612-B' },
    { id: 'ret-03', t: t1, name: 'Pacific Coast Gourmet Markets', cp: 'Liam Vance', email: 'purchasing@pacificgourmet.com', phone: '+1-555-3002', addr: '320 University Ave, Palo Alto, CA', lat: 37.4444, lng: -122.1610, tax: 'TX-94301-C' }
  ];

  for (const r of retailers) {
    insertRetailer.run(r.id, r.t, r.name, r.cp, r.email, r.phone, r.addr, r.lat, r.lng, r.tax);
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, order_number, tenant_id, retailer_id, product_name, batch_id, requested_qty_kg, unit_price, total_amount, delivery_address, delivery_lat, delivery_lng, required_delivery_date, status, pipeline_stage, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const orders = [
    { id: 'ord-001', num: 'ORD-2026-0801', t: t1, rid: 'ret-01', prod: 'Roma Tomatoes Grade A', bid: 'bat-001', qty: 2600, price: 3.20, total: 8320.00, addr: '2000 Market St, San Francisco, CA', lat: 37.7699, lng: -122.4271, rdate: '2026-09-30', stat: 'IN_TRANSIT', pipe: 'IN_TRANSIT', prio: 'HIGH' },
    { id: 'ord-002', num: 'ORD-2026-0802', t: t1, rid: 'ret-02', prod: 'Organic Strawberries', bid: 'bat-002', qty: 3000, price: 6.50, total: 19500.00, addr: '415 14th St, Oakland, CA', lat: 37.8040, lng: -122.2700, rdate: '2026-08-10', stat: 'DELIVERED', pipe: 'DELIVERED', prio: 'MEDIUM' },
    { id: 'ord-003', num: 'ORD-2026-0803', t: t1, rid: 'ret-03', prod: 'Valencia Oranges', bid: 'bat-003', qty: 4500, price: 2.80, total: 12600.00, addr: '320 University Ave, Palo Alto, CA', lat: 37.4444, lng: -122.1610, rdate: '2026-10-02', stat: 'APPROVED', pipe: 'APPROVED', prio: 'URGENT' },
    { id: 'ord-004', num: 'ORD-2026-0804', t: t1, rid: 'ret-01', prod: 'Hass Avocados', bid: null, qty: 1500, price: 5.40, total: 8100.00, addr: '2000 Market St, San Francisco, CA', lat: 37.7699, lng: -122.4271, rdate: '2026-10-05', stat: 'PROCESSING', pipe: 'PROCESSING', prio: 'MEDIUM' },
    { id: 'ord-005', num: 'ORD-2026-0805', t: t1, rid: 'ret-02', prod: 'Baby Spinach', bid: null, qty: 800, price: 4.90, total: 3920.00, addr: '415 14th St, Oakland, CA', lat: 37.8040, lng: -122.2700, rdate: '2026-10-08', stat: 'SUBMITTED', pipe: 'NEW', prio: 'LOW' }
  ];

  for (const o of orders) {
    insertOrder.run(o.id, o.num, o.t, o.rid, o.prod, o.bid, o.qty, o.price, o.total, o.addr, o.lat, o.lng, o.rdate, o.stat, o.pipe, o.prio);
  }

  console.log('[SEED] Seeding Shipments...');
  const insertShipment = db.prepare(`
    INSERT INTO shipments (id, shipment_number, tenant_id, order_id, batch_id, vehicle_id, driver_id, origin_type, origin_name, origin_lat, origin_lng, destination_type, destination_name, destination_lat, destination_lng, departure_time, estimated_arrival, status, required_min_temp_c, required_max_temp_c, temperature_status, distance_km)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const shipments = [
    {
      id: 'shp-001', num: 'SHP-2026-0091', t: t1, oid: 'ord-001', bid: 'bat-001', vid: 'veh-01', did: 'drv-01',
      otype: 'WAREHOUSE', oname: 'Central Cold Hub Alpha', olat: 37.8044, olng: -122.2712,
      dtype: 'RETAILER', dname: 'Metro Fresh Supermarkets', dlat: 37.7699, dlng: -122.4271,
      dep: '2026-09-28 06:30:00', eta: '2026-09-28 09:45:00', stat: 'IN_TRANSIT',
      minT: 2.0, maxT: 8.0, tstat: 'NORMAL', dist: 38.5
    },
    {
      id: 'shp-002', num: 'SHP-2026-0082', t: t1, oid: 'ord-002', bid: 'bat-002', vid: 'veh-02', did: 'drv-03',
      otype: 'WAREHOUSE', oname: 'Central Cold Hub Alpha', olat: 37.8044, olng: -122.2712,
      dtype: 'RETAILER', dname: 'WholeEarth Organic Grocers', dlat: 37.8040, dlng: -122.2700,
      dep: '2026-08-05 08:00:00', eta: '2026-08-05 09:00:00', stat: 'DELIVERED',
      minT: 0.5, maxT: 4.0, tstat: 'NORMAL', dist: 12.0
    },
    {
      id: 'shp-003', num: 'SHP-2026-0099', t: t1, oid: null, bid: 'bat-003', vid: 'veh-03', did: 'drv-02',
      otype: 'FARM', oname: 'Sunburst Citrus Groves', olat: 34.4480, olng: -119.2429,
      dtype: 'WAREHOUSE', dname: 'Central Cold Hub Alpha', dlat: 37.8044, dlng: -122.2712,
      dep: '2026-09-28 05:00:00', eta: '2026-09-28 12:30:00', stat: 'IN_TRANSIT',
      minT: 4.0, maxT: 9.0, tstat: 'WARNING', dist: 550.0
    }
  ];

  for (const s of shipments) {
    insertShipment.run(s.id, s.num, s.t, s.oid, s.bid, s.vid, s.did, s.otype, s.oname, s.olat, s.olng, s.dtype, s.dname, s.dlat, s.dlng, s.dep, s.eta, s.stat, s.minT, s.maxT, s.tstat, s.dist);
  }

  console.log('[SEED] Seeding Geofences and Events...');
  const insertGeofence = db.prepare(`
    INSERT INTO geofences (id, tenant_id, name, zone_type, latitude, longitude, radius_meters, coordinates_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const geofences = [
    { id: 'geo-01', t: t1, name: 'Central Cold Hub Alpha Security Perimeter', type: 'WAREHOUSE', lat: 37.8044, lng: -122.2712, rad: 600, poly: null },
    { id: 'geo-02', t: t1, name: 'Valley Green Farm Loading Gate', type: 'FARM', lat: 36.6777, lng: -121.6555, rad: 800, poly: null },
    { id: 'geo-03', t: t1, name: 'Metro Fresh Receiving Bay', type: 'DELIVERY', lat: 37.7699, lng: -122.4271, rad: 350, poly: null },
    { id: 'geo-04', t: t1, name: 'Pacific Gateway Port Cold Zone', type: 'COLD_STORAGE', lat: 33.7701, lng: -118.1937, rad: 1000, poly: null }
  ];

  for (const g of geofences) {
    insertGeofence.run(g.id, g.t, g.name, g.type, g.lat, g.lng, g.rad, g.poly);
  }

  const insertGeoEvent = db.prepare(`
    INSERT INTO geofence_events (id, tenant_id, geofence_id, vehicle_id, shipment_id, event_type, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertGeoEvent.run('gev-01', t1, 'geo-01', 'veh-01', 'shp-001', 'VEHICLE_LEFT_ZONE', 37.8042, -122.2715);
  insertGeoEvent.run('gev-02', t1, 'geo-03', 'veh-02', 'shp-002', 'DELIVERY_ZONE_REACHED', 37.7698, -122.4270);

  console.log('[SEED] Seeding IoT Sensors and Cold Chain Telemetry...');
  const insertSensor = db.prepare(`
    INSERT INTO sensors (id, sensor_code, tenant_id, sensor_type, attached_type, attached_id, min_threshold, max_threshold, current_value, secondary_value, battery_pct, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sensors = [
    { id: 'sns-01', code: 'SNS-REEFER-7K921', t: t1, type: 'TEMPERATURE', att: 'VEHICLE', attId: 'veh-01', minT: 2.0, maxT: 8.0, val: 4.8, sec: 85.0, bat: 94, stat: 'ONLINE' },
    { id: 'sns-02', code: 'SNS-DOOR-7K921', t: t1, type: 'DOOR', att: 'VEHICLE', attId: 'veh-01', minT: 0, maxT: 1, val: 0, sec: null, bat: 96, stat: 'ONLINE' },
    { id: 'sns-03', code: 'SNS-REEFER-9M104', t: t1, type: 'TEMPERATURE', att: 'VEHICLE', attId: 'veh-03', minT: 4.0, maxT: 9.0, val: 9.4, sec: 78.0, bat: 89, stat: 'WARNING' },
    { id: 'sns-04', code: 'SNS-COLDROOM-OAK-01', t: t1, type: 'TEMPERATURE', att: 'WAREHOUSE', attId: 'wh-01', minT: 1.0, maxT: 5.0, val: 3.8, sec: 88.0, bat: 100, stat: 'ONLINE' },
    { id: 'sns-05', code: 'SNS-COLDROOM-OAK-02', t: t1, type: 'HUMIDITY', att: 'WAREHOUSE', attId: 'wh-01', minT: 80.0, maxT: 95.0, val: 91.0, sec: 2.2, bat: 100, stat: 'ONLINE' }
  ];

  for (const s of sensors) {
    insertSensor.run(s.id, s.code, s.t, s.type, s.att, s.attId, s.minT, s.maxT, s.val, s.sec, s.bat, s.stat);
  }

  console.log('[SEED] Seeding historical sensor readings...');
  const insertReading = db.prepare(`
    INSERT INTO sensor_readings (id, sensor_id, tenant_id, reading_type, value, secondary_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Generate 24 hourly readings for primary reefer sensor
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const timeStr = new Date(now - i * 3600 * 1000).toISOString();
    const tempVal = +(4.0 + Math.sin(i / 3) * 0.8 + (Math.random() * 0.4)).toFixed(2);
    const humVal = +(85 + Math.cos(i / 2) * 4).toFixed(1);
    insertReading.run(uuidv4(), 'sns-01', t1, 'TEMPERATURE', tempVal, humVal, timeStr);
  }

  console.log('[SEED] Seeding Cold Chain Alerts...');
  const insertAlert = db.prepare(`
    INSERT INTO temperature_alerts (id, tenant_id, sensor_id, shipment_id, warehouse_id, severity, alert_type, message, reading_value, threshold_value, status, acknowledged_by, resolved_by, resolution_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const alerts = [
    {
      id: 'alt-001', t: t1, sid: 'sns-03', shp: 'shp-003', wh: null, sev: 'WARNING', type: 'TEMP_EXCURSION',
      msg: 'Reefer truck CA-9M104 temperature reached 9.4°C exceeding maximum safe threshold of 9.0°C',
      val: 9.4, thresh: 9.0, stat: 'OPEN', ack: null, res: null, notes: null
    },
    {
      id: 'alt-002', t: t1, sid: 'sns-02', shp: 'shp-001', wh: null, sev: 'INFO', type: 'DOOR_OPEN',
      msg: 'Rear cargo door opened during transit checkpoint at Salinas weighing station',
      val: 1, thresh: 0, stat: 'RESOLVED', ack: 'usr-transportmgr', res: 'usr-transportmgr',
      notes: 'Standard DOT inspection stop. Cargo door resealed and chilled back down to 4.2°C.'
    }
  ];

  for (const a of alerts) {
    insertAlert.run(a.id, a.t, a.sid, a.shp, a.wh, a.sev, a.type, a.msg, a.val, a.thresh, a.stat, a.ack, a.res, a.notes);
  }

  console.log('[SEED] Seeding Proof of Delivery & Deliveries...');
  const insertDelivery = db.prepare(`
    INSERT INTO deliveries (id, receipt_number, shipment_id, order_id, tenant_id, receiver_name, receiver_signature_data, receiver_photo_url, gps_lat, gps_lng, delivered_qty_kg, damaged_qty_kg, delivery_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDelivery.run(
    'del-001', 'POD-2026-90082', 'shp-002', 'ord-002', t1,
    'Clara Oswald (Receiving Manager)',
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M10,40 Q50,10 90,40 T180,30" stroke="black" stroke-width="2" fill="none"/></svg>',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop',
    37.8040, -122.2700, 3000, 0, 'Pallets intact, temperature verified upon unloading at 2.4°C.'
  );

  console.log('[SEED] Seeding Invoices & Payments...');
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, invoice_number, tenant_id, order_id, retailer_id, total_amount, tax_amount, transport_charges, warehouse_charges, discount_amount, net_payable, status, due_date, issued_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const invoices = [
    { id: 'inv-001', num: 'INV-2026-0041', t: t1, oid: 'ord-002', rid: 'ret-02', tot: 19500, tax: 1560, trans: 650, wh: 300, disc: 200, net: 21810, stat: 'PAID', due: '2026-09-05', issued: '2026-08-06' },
    { id: 'inv-002', num: 'INV-2026-0042', t: t1, oid: 'ord-001', rid: 'ret-01', tot: 8320, tax: 665.6, trans: 420, wh: 180, disc: 0, net: 9585.60, stat: 'UNPAID', due: '2026-10-15', issued: '2026-09-28' }
  ];

  for (const inv of invoices) {
    insertInvoice.run(inv.id, inv.num, inv.t, inv.oid, inv.rid, inv.tot, inv.tax, inv.trans, inv.wh, inv.disc, inv.net, inv.stat, inv.due, inv.issued);
  }

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, payment_number, tenant_id, invoice_id, amount, payment_method, transaction_reference, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPayment.run('pay-001', 'PAY-2026-8801', t1, 'inv-001', 21810, 'ACH_TRANSFER', 'TXN-WF-98402198', 'COMPLETED');

  console.log('[SEED] Seeding Expenses...');
  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, tenant_id, category, amount, description, vehicle_id, warehouse_id, incurred_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const expenses = [
    { id: 'exp-01', t: t1, cat: 'FUEL', amt: 420.50, desc: 'Diesel fuel refill for truck CA-7K921', vid: 'veh-01', wid: null, date: '2026-09-27' },
    { id: 'exp-02', t: t1, cat: 'COLD_STORAGE_POWER', amt: 3200.00, desc: 'Sub-zero refrigeration power monthly grid charge', vid: null, wid: 'wh-01', date: '2026-09-01' },
    { id: 'exp-03', t: t1, cat: 'MAINTENANCE', amt: 850.00, desc: 'Carrier Transicold reefer compressor preventive servicing', vid: 'veh-03', wid: null, date: '2026-09-15' }
  ];

  for (const exp of expenses) {
    insertExpense.run(exp.id, exp.t, exp.cat, exp.amt, exp.desc, exp.vid, exp.wid, exp.date);
  }

  console.log('[SEED] Seeding Audit Logs...');
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, tenant_id, user_id, user_email, action, module, record_id, old_values, new_values, ip_address, device_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(uuidv4(), t1, 'usr-tenantadmin', 'tenantadmin@greenvalley.com', 'INITIALIZE', 'SYSTEM', 'SYS-ROOT', null, JSON.stringify({ event: 'System initialized and seeded' }), '127.0.0.1', 'Seed Runner 1.0');
  insertAudit.run(uuidv4(), t1, 'usr-inspector', 'inspector.alex@greenvalley.com', 'APPROVE', 'QUALITY_INSPECTION', 'insp-001', JSON.stringify({ status: 'PENDING' }), JSON.stringify({ status: 'PASSED', batch: 'bat-001' }), '192.168.1.45', 'Chrome 128 / iPad Pro');
  insertAudit.run(uuidv4(), t1, 'usr-transportmgr', 'transport.david@greenvalley.com', 'ASSIGN_DRIVER', 'SHIPMENT', 'shp-001', null, JSON.stringify({ driver: 'usr-driver1', vehicle: 'veh-01' }), '192.168.1.12', 'Chrome 128 / macOS');

  console.log('[SEED] Seed completed successfully!');
}

// If executed directly via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed().catch(err => {
    console.error('[SEED] Failed to seed database:', err);
    process.exit(1);
  });
}
