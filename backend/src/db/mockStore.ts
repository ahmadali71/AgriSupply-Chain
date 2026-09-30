import fs from 'fs';
import path from 'path';

const isVercel = Boolean(process.env.VERCEL);
const STORE_FILE = isVercel
  ? path.join('/tmp', 'agrisupply_store.json')
  : path.join(process.cwd(), 'data', 'agrisupply_store.json');

const DEMO_BCRYPT_HASH = '$2a$10$mB7priheKVUx3ZMet4CjUOzIlrwms0cIAAsu0ptIP6OBn56aL1xsK'; // 'password123'

const INITIAL_DATA: Record<string, any[]> = {
  tenants: [
    { id: 'tenant-greenvalley', name: 'GreenValley Agro Logistics', slug: 'greenvalley', plan: 'ENTERPRISE', status: 'ACTIVE', contact_email: 'contact@greenvalley.com', contact_phone: '+1-555-0100', settings_json: '{"currency":"USD","tempUnit":"C","timezone":"America/Los_Angeles"}' },
    { id: 'tenant-freshdirect', name: 'FreshDirect Highlands Co.', slug: 'freshdirect', plan: 'PROFESSIONAL', status: 'ACTIVE', contact_email: 'contact@freshdirect.com', contact_phone: '+1-555-0200', settings_json: '{"currency":"USD","tempUnit":"C","timezone":"America/Denver"}' }
  ],
  users: [
    { id: 'usr-superadmin', tenant_id: 'tenant-greenvalley', email: 'admin@agrisupply.com', password_hash: DEMO_BCRYPT_HASH, role: 'SUPER_ADMIN', full_name: 'Arthur Vance (Super Admin)', phone: '+1-555-1000', status: 'ACTIVE', assigned_tabs: '["*"]' },
    { id: 'usr-farmer', tenant_id: 'tenant-greenvalley', email: 'farmer.chen@agrisupply.com', password_hash: DEMO_BCRYPT_HASH, role: 'FARMER', full_name: 'Chen Wei (Organic Farmer)', phone: '+1-555-2001', status: 'ACTIVE', assigned_tabs: '["dashboard","farms","crops","batches","inspections","traceability","orders"]' },
    { id: 'usr-driver', tenant_id: 'tenant-greenvalley', email: 'elena.driver@agrisupply.com', password_hash: DEMO_BCRYPT_HASH, role: 'DRIVER', full_name: 'Elena Rostova (Fleet Driver)', phone: '+1-555-3001', status: 'ACTIVE', assigned_tabs: '["dashboard","driver-portal","live-tracking","shipments","deliveries"]' },
    { id: 'usr-warehouse', tenant_id: 'tenant-greenvalley', email: 'marcus.warehouse@agrisupply.com', password_hash: DEMO_BCRYPT_HASH, role: 'WAREHOUSE_MANAGER', full_name: 'Marcus Vance (Cold-Hub Lead)', phone: '+1-555-4001', status: 'ACTIVE', assigned_tabs: '["dashboard","inventory","warehouses","sensors","alerts","batches","orders","deliveries","reports"]' },
    { id: 'usr-retailer', tenant_id: 'tenant-greenvalley', email: 'retailer@freshmarket.com', password_hash: DEMO_BCRYPT_HASH, role: 'RETAILER', full_name: 'FreshMarket Organic Store', phone: '+1-555-5001', status: 'ACTIVE', assigned_tabs: '["dashboard","orders","deliveries","invoices","traceability","live-tracking"]' }
  ],
  farmers: [
    { id: 'frm-001', tenant_id: 'tenant-greenvalley', user_id: 'usr-farmer', full_name: 'Chen Wei', phone: '+1-555-2001', national_id: 'ID-884920', address: '104 Salinas River Rd, Salinas, CA', experience_years: 16, cooperative_name: 'Salinas Valley Organic Growers' },
    { id: 'frm-002', tenant_id: 'tenant-greenvalley', user_id: null, full_name: 'Mateo Hernandez', phone: '+1-555-1102', national_id: 'ID-339281', address: '512 Watsonville Way, Watsonville, CA', experience_years: 12, cooperative_name: 'Pacific Berry Producers Co-op' },
    { id: 'frm-003', tenant_id: 'tenant-greenvalley', user_id: null, full_name: 'Brenda Lawson', phone: '+1-555-1103', national_id: 'ID-992014', address: '88 Ojai Foothill Blvd, Ojai, CA', experience_years: 20, cooperative_name: 'Southern Coast Citrus Alliance' }
  ],
  farms: [
    { id: 'farm-01', tenant_id: 'tenant-greenvalley', farmer_id: 'frm-001', name: 'Valley Green Organic Farm', location: 'Salinas Valley, CA', latitude: 36.6777, longitude: -121.6555, size_acres: 280, crop_types: 'Roma Tomatoes, Romaine Lettuce', capacity_tons: 650, irrigation_type: 'DRIP', certification: 'USDA_ORGANIC', contact_phone: '+1-555-7001' },
    { id: 'farm-02', tenant_id: 'tenant-greenvalley', farmer_id: 'frm-002', name: 'Highland Berry Ranch', location: 'Watsonville, CA', latitude: 36.9102, longitude: -121.7569, size_acres: 140, crop_types: 'Strawberries, Blackberries', capacity_tons: 320, irrigation_type: 'MICRO_SPRINKLER', certification: 'GLOBAL_GAP', contact_phone: '+1-555-7002' },
    { id: 'farm-03', tenant_id: 'tenant-greenvalley', farmer_id: 'frm-003', name: 'Sunburst Citrus Groves', location: 'Ojai Valley, CA', latitude: 34.4480, longitude: -119.2429, size_acres: 350, crop_types: 'Valencia Oranges, Meyer Lemons', capacity_tons: 900, irrigation_type: 'DRIP', certification: 'FAIR_TRADE', contact_phone: '+1-555-7003' },
    { id: 'farm-04', tenant_id: 'tenant-greenvalley', farmer_id: 'frm-001', name: 'Emerald Leaf Organic Fields', location: 'Santa Maria, CA', latitude: 34.9530, longitude: -120.4357, size_acres: 210, crop_types: 'Baby Spinach, Kale, Broccoli', capacity_tons: 480, irrigation_type: 'DRIP', certification: 'USDA_ORGANIC', contact_phone: '+1-555-7004' },
    { id: 'farm-05', tenant_id: 'tenant-greenvalley', farmer_id: 'frm-002', name: 'Golden Harvest Orchards', location: 'Fresno Country, CA', latitude: 36.7468, longitude: -119.7726, size_acres: 400, crop_types: 'Hass Avocados, Peaches', capacity_tons: 1200, irrigation_type: 'SUBSURFACE_DRIP', certification: 'GLOBAL_GAP', contact_phone: '+1-555-7005' }
  ],
  crops: [
    { id: 'crp-01', tenant_id: 'tenant-greenvalley', farm_id: 'farm-01', name: 'Roma Tomatoes', variety: 'San Marzano Hybrid', season: 'Summer 2026', planting_date: '2026-04-15', expected_harvest_date: '2026-08-20', estimated_qty_kg: 25000, actual_qty_kg: 24200, quality_grade: 'GRADE_A', lifecycle_status: 'HARVESTED' },
    { id: 'crp-02', tenant_id: 'tenant-greenvalley', farm_id: 'farm-02', name: 'Organic Strawberries', variety: 'Albion Premium', season: 'Spring/Summer 2026', planting_date: '2026-03-01', expected_harvest_date: '2026-07-15', estimated_qty_kg: 12000, actual_qty_kg: 11800, quality_grade: 'GRADE_A', lifecycle_status: 'HARVESTED' },
    { id: 'crp-03', tenant_id: 'tenant-greenvalley', farm_id: 'farm-03', name: 'Valencia Oranges', variety: 'Midnight Seedless', season: 'Summer 2026', planting_date: '2025-11-10', expected_harvest_date: '2026-09-01', estimated_qty_kg: 40000, actual_qty_kg: 39500, quality_grade: 'GRADE_A', lifecycle_status: 'HARVESTED' },
    { id: 'crp-04', tenant_id: 'tenant-greenvalley', farm_id: 'farm-04', name: 'Crisp Romaine Lettuce', variety: 'Green Towers', season: 'Fall 2026', planting_date: '2026-07-10', expected_harvest_date: '2026-10-05', estimated_qty_kg: 18000, actual_qty_kg: 0, quality_grade: 'GRADE_A', lifecycle_status: 'GROWING' },
    { id: 'crp-05', tenant_id: 'tenant-greenvalley', farm_id: 'farm-05', name: 'Hass Avocados', variety: 'Premium Dark Skin', season: 'Summer 2026', planting_date: '2025-08-20', expected_harvest_date: '2026-08-28', estimated_qty_kg: 32000, actual_qty_kg: 31400, quality_grade: 'GRADE_A', lifecycle_status: 'HARVESTED' }
  ],
  harvests: [
    { id: 'hrv-01', tenant_id: 'tenant-greenvalley', crop_id: 'crp-01', farm_id: 'farm-01', harvest_date: '2026-08-22', yield_kg: 24200, grade: 'GRADE_A', weather_condition: 'Dry, 22C, Moderate Breeze', notes: 'Excellent firm fruit, optimal brix ratio' },
    { id: 'hrv-02', tenant_id: 'tenant-greenvalley', crop_id: 'crp-02', farm_id: 'farm-02', harvest_date: '2026-07-18', yield_kg: 11800, grade: 'GRADE_A', weather_condition: 'Overcast, 18C, High Humidity', notes: 'Immediate cold pre-cooling applied at 2C' },
    { id: 'hrv-03', tenant_id: 'tenant-greenvalley', crop_id: 'crp-03', farm_id: 'farm-03', harvest_date: '2026-09-03', yield_kg: 39500, grade: 'GRADE_A', weather_condition: 'Sunny, 28C, Dry', notes: 'High juice content, uniform size' },
    { id: 'hrv-04', tenant_id: 'tenant-greenvalley', crop_id: 'crp-05', farm_id: 'farm-05', harvest_date: '2026-08-30', yield_kg: 31400, grade: 'GRADE_A', weather_condition: 'Clear, 25C', notes: 'Optimal dry matter content 24%' }
  ],
  batches: [
    { id: 'bat-001', batch_number: 'BATCH-2026-TOM-000101', tenant_id: 'tenant-greenvalley', crop_id: 'crp-01', farm_id: 'farm-01', harvest_id: 'hrv-01', product_name: 'Roma Tomatoes Grade A', quantity_kg: 5000, available_kg: 1200, unit: 'KG', quality_grade: 'GRADE_A', harvest_date: '2026-08-22', expiry_date: '2026-10-15', storage_type: 'COLD_STORAGE', min_temp_c: 2.0, max_temp_c: 8.0, current_location: 'CENTRAL_ALPHA_COLD_ROOM_1', status: 'IN_WAREHOUSE' },
    { id: 'bat-002', batch_number: 'BATCH-2026-STR-000204', tenant_id: 'tenant-greenvalley', crop_id: 'crp-02', farm_id: 'farm-02', harvest_id: 'hrv-02', product_name: 'Organic Strawberries', quantity_kg: 3500, available_kg: 500, unit: 'KG', quality_grade: 'GRADE_A', harvest_date: '2026-07-18', expiry_date: '2026-08-15', storage_type: 'COLD_STORAGE', min_temp_c: 0.5, max_temp_c: 4.0, current_location: 'CENTRAL_ALPHA_COLD_ROOM_2', status: 'DELIVERED' },
    { id: 'bat-003', batch_number: 'BATCH-2026-CIT-000305', tenant_id: 'tenant-greenvalley', crop_id: 'crp-03', farm_id: 'farm-03', harvest_id: 'hrv-03', product_name: 'Valencia Oranges', quantity_kg: 8000, available_kg: 8000, unit: 'KG', quality_grade: 'GRADE_A', harvest_date: '2026-09-03', expiry_date: '2026-11-30', storage_type: 'CONTROLLED_ATMOSPHERE', min_temp_c: 4.0, max_temp_c: 9.0, current_location: 'TRUCK_CA-7K921', status: 'IN_TRANSIT' },
    { id: 'bat-004', batch_number: 'BATCH-2026-AVO-000412', tenant_id: 'tenant-greenvalley', crop_id: 'crp-05', farm_id: 'farm-05', harvest_id: 'hrv-04', product_name: 'Hass Avocados', quantity_kg: 6000, available_kg: 6000, unit: 'KG', quality_grade: 'GRADE_A', harvest_date: '2026-08-30', expiry_date: '2026-10-20', storage_type: 'COLD_STORAGE', min_temp_c: 4.0, max_temp_c: 7.0, current_location: 'FARM_GATE', status: 'INSPECTION_PENDING' }
  ],
  quality_inspections: [
    { id: 'insp-001', tenant_id: 'tenant-greenvalley', batch_id: 'bat-001', inspector_id: 'usr-superadmin', inspection_date: '2026-08-23 10:15:00', product_type: 'VEGETABLES', visual_score: 9.6, weight_kg: 5000, size_mm: 68.5, moisture_pct: 91.2, measured_temp_c: 4.2, packaging_integrity: 'INTACT_VENTILATED', contamination_detected: 0, damage_pct: 0.8, result: 'PASSED', inspector_signature: 'Alex Wong', inspector_notes: 'Excellent color uniformity, skin tension is crisp. Permitted for cold transport.' },
    { id: 'insp-002', tenant_id: 'tenant-greenvalley', batch_id: 'bat-002', inspector_id: 'usr-superadmin', inspection_date: '2026-07-19 09:30:00', product_type: 'BERRIES', visual_score: 9.8, weight_kg: 3500, size_mm: 32.0, moisture_pct: 88.4, measured_temp_c: 2.1, packaging_integrity: 'CLAMSHELL_PUNCHED', contamination_detected: 0, damage_pct: 0.2, result: 'PASSED', inspector_signature: 'Alex Wong', inspector_notes: 'Superb berry firmness and sugar content. Quick chill validated.' }
  ],
  warehouses: [
    { id: 'wh-01', tenant_id: 'tenant-greenvalley', name: 'Central Cold Hub Alpha', code: 'WH-OAK-01', address: '820 Maritime St, Oakland, CA', latitude: 37.8044, longitude: -122.2712, total_capacity_sqft: 75000, total_cold_rooms: 6, status: 'ACTIVE', manager_id: 'usr-warehouse', location_count: 6, total_occupied_kg: 35000, total_storage_capacity_kg: 100000 },
    { id: 'wh-02', tenant_id: 'tenant-greenvalley', name: 'Pacific Gateway Cold Storage', code: 'WH-LGB-02', address: '1100 Pier F Ave, Long Beach, CA', latitude: 33.7701, longitude: -118.1937, total_capacity_sqft: 90000, total_cold_rooms: 8, status: 'ACTIVE', manager_id: null, location_count: 8, total_occupied_kg: 52000, total_storage_capacity_kg: 140000 },
    { id: 'wh-03', tenant_id: 'tenant-greenvalley', name: 'Central Valley Agro Depot', code: 'WH-FRS-03', address: '3400 E Central Ave, Fresno, CA', latitude: 36.7012, longitude: -119.7422, total_capacity_sqft: 110000, total_cold_rooms: 10, status: 'ACTIVE', manager_id: null, location_count: 10, total_occupied_kg: 21000, total_storage_capacity_kg: 75000 }
  ],
  storage_locations: [
    { id: 'loc-01', tenant_id: 'tenant-greenvalley', warehouse_id: 'wh-01', zone_name: 'Zone A - Fresh Produce', rack: 'RACK-01', shelf: 'SHELF-A', cold_room_id: 'CR-ALPHA-01', is_cold_storage: 1, capacity_kg: 20000, current_occupancy_kg: 3800, target_temp_c: 4.0, target_humidity_pct: 88.0, status: 'OPTIMAL' },
    { id: 'loc-02', tenant_id: 'tenant-greenvalley', warehouse_id: 'wh-01', zone_name: 'Zone B - Deep Chilled Berries', rack: 'RACK-02', shelf: 'SHELF-B', cold_room_id: 'CR-ALPHA-02', is_cold_storage: 1, capacity_kg: 15000, current_occupancy_kg: 500, target_temp_c: 1.5, target_humidity_pct: 92.0, status: 'OPTIMAL' }
  ],
  inventory: [
    { id: 'inv-01', tenant_id: 'tenant-greenvalley', warehouse_id: 'wh-01', storage_location_id: 'loc-01', batch_id: 'bat-001', product_name: 'Roma Tomatoes Grade A', available_qty_kg: 1200, reserved_qty_kg: 2600, damaged_qty_kg: 0, unit: 'KG', expiry_date: '2026-10-15', status: 'IN_STORAGE' },
    { id: 'inv-02', tenant_id: 'tenant-greenvalley', warehouse_id: 'wh-01', storage_location_id: 'loc-02', batch_id: 'bat-002', product_name: 'Organic Strawberries', available_qty_kg: 500, reserved_qty_kg: 0, damaged_qty_kg: 0, unit: 'KG', expiry_date: '2026-08-15', status: 'IN_STORAGE' }
  ],
  vehicles: [
    { id: 'veh-01', tenant_id: 'tenant-greenvalley', plate_number: 'CA-7K921', model: 'Freightliner Cascadia eReefer 2026', capacity_kg: 18000, is_refrigerated: 1, min_temp_c: 1.0, max_temp_c: 8.0, current_lat: 36.8500, current_lng: -120.7200, current_speed_kmh: 88, current_temp_c: 3.8, fuel_pct: 82, battery_pct: 94, status: 'IN_TRANSIT' },
    { id: 'veh-02', tenant_id: 'tenant-greenvalley', plate_number: 'CA-8X442', model: 'Kenworth T680 ThermoKing Aero', capacity_kg: 22000, is_refrigerated: 1, min_temp_c: -20.0, max_temp_c: 4.0, current_lat: 37.8044, current_lng: -122.2712, current_speed_kmh: 0, current_temp_c: 4.0, fuel_pct: 95, battery_pct: 100, status: 'AVAILABLE' }
  ],
  drivers: [
    { id: 'drv-01', tenant_id: 'tenant-greenvalley', user_id: 'usr-driver', full_name: 'Elena Rostova', license_number: 'CDL-CA-992019', phone: '+1-555-3001', status: 'ON_TRIP', current_vehicle_id: 'veh-01' },
    { id: 'drv-02', tenant_id: 'tenant-greenvalley', user_id: null, full_name: 'Carlos Mendez', license_number: 'CDL-CA-448210', phone: '+1-555-3002', status: 'AVAILABLE', current_vehicle_id: null }
  ],
  retailers: [
    { id: 'ret-01', tenant_id: 'tenant-greenvalley', name: 'Metro Fresh Supermarkets Inc.', contact_person: 'Marcus Brody', email: 'retailer@freshmarket.com', phone: '+1-555-5001', address: '2000 Market St, San Francisco, CA', latitude: 37.7699, longitude: -122.4271, tax_id: 'TX-94103-A' },
    { id: 'ret-02', tenant_id: 'tenant-greenvalley', name: 'WholeEarth Organic Grocers', contact_person: 'Clara Oswald', email: 'orders@wholeearth.com', phone: '+1-555-3001', address: '415 14th St, Oakland, CA', latitude: 37.8040, longitude: -122.2700, tax_id: 'TX-94612-B' }
  ],
  orders: [
    { id: 'ord-001', order_number: 'ORD-2026-0801', tenant_id: 'tenant-greenvalley', retailer_id: 'ret-01', product_name: 'Roma Tomatoes Grade A', batch_id: 'bat-001', requested_qty_kg: 2600, unit_price: 3.20, total_amount: 8320.00, delivery_address: '2000 Market St, San Francisco, CA', delivery_lat: 37.7699, delivery_lng: -122.4271, required_delivery_date: '2026-09-30', status: 'IN_TRANSIT', pipeline_stage: 'IN_TRANSIT', priority: 'HIGH' },
    { id: 'ord-002', order_number: 'ORD-2026-0802', tenant_id: 'tenant-greenvalley', retailer_id: 'ret-02', product_name: 'Organic Strawberries', batch_id: 'bat-002', requested_qty_kg: 3000, unit_price: 6.50, total_amount: 19500.00, delivery_address: '415 14th St, Oakland, CA', delivery_lat: 37.8040, delivery_lng: -122.2700, required_delivery_date: '2026-08-10', status: 'DELIVERED', pipeline_stage: 'DELIVERED', priority: 'MEDIUM' }
  ],
  shipments: [
    { id: 'shp-001', shipment_number: 'SHP-2026-0091', tenant_id: 'tenant-greenvalley', order_id: 'ord-001', batch_id: 'bat-001', vehicle_id: 'veh-01', driver_id: 'drv-01', origin_type: 'WAREHOUSE', origin_name: 'Central Cold Hub Alpha', origin_lat: 37.8044, origin_lng: -122.2712, destination_type: 'RETAILER', destination_name: 'Metro Fresh Supermarkets', destination_lat: 37.7699, destination_lng: -122.4271, departure_time: '2026-09-28 06:30:00', estimated_arrival: '2026-09-28 09:45:00', status: 'IN_TRANSIT', required_min_temp_c: 2.0, required_max_temp_c: 8.0, temperature_status: 'NORMAL', distance_km: 38.5 },
    { id: 'shp-002', shipment_number: 'SHP-2026-0082', tenant_id: 'tenant-greenvalley', order_id: 'ord-002', batch_id: 'bat-002', vehicle_id: 'veh-02', driver_id: 'drv-01', origin_type: 'WAREHOUSE', origin_name: 'Central Cold Hub Alpha', origin_lat: 37.8044, origin_lng: -122.2712, destination_type: 'RETAILER', destination_name: 'WholeEarth Organic Grocers', destination_lat: 37.8040, destination_lng: -122.2700, departure_time: '2026-08-05 08:00:00', estimated_arrival: '2026-08-05 09:00:00', status: 'DELIVERED', required_min_temp_c: 0.5, required_max_temp_c: 4.0, temperature_status: 'NORMAL', distance_km: 12.0 }
  ],
  geofences: [
    { id: 'geo-01', tenant_id: 'tenant-greenvalley', name: 'Central Cold Hub Alpha Security Perimeter', zone_type: 'WAREHOUSE', latitude: 37.8044, longitude: -122.2712, radius_meters: 600, coordinates_json: null },
    { id: 'geo-02', tenant_id: 'tenant-greenvalley', name: 'Valley Green Farm Loading Gate', zone_type: 'FARM', latitude: 36.6777, longitude: -121.6555, radius_meters: 800, coordinates_json: null }
  ],
  geofence_events: [],
  sensors: [
    { id: 'sns-01', sensor_code: 'SNS-CA-7K921', tenant_id: 'tenant-greenvalley', sensor_type: 'TEMPERATURE', attached_type: 'VEHICLE', attached_id: 'veh-01', min_threshold: 1.0, max_threshold: 8.0, current_value: 3.8, secondary_value: 88, battery_pct: 94, status: 'ONLINE' },
    { id: 'sns-02', sensor_code: 'SNS-CR-ALPHA-01', tenant_id: 'tenant-greenvalley', sensor_type: 'TEMPERATURE', attached_type: 'WAREHOUSE', attached_id: 'wh-01', min_threshold: 2.0, max_threshold: 6.0, current_value: 4.0, secondary_value: 88, battery_pct: 99, status: 'ONLINE' }
  ],
  temperature_alerts: [
    {
      id: 'alt-001',
      sensor_id: 'sns-01',
      tenant_id: 'tenant-greenvalley',
      sensor_type: 'TEMPERATURE',
      attached_type: 'VEHICLE',
      attached_id: 'veh-01',
      temperature_c: 4.8,
      severity: 'WARNING',
      status: 'OPEN',
      notes: 'Slight temperature variance during freeway transit',
      timestamp: '2026-09-30 11:20:00'
    }
  ],
  invoices: [
    {
      id: 'inv-001',
      invoice_number: 'INV-2026-0045',
      tenant_id: 'tenant-greenvalley',
      order_id: 'ord-001',
      retailer_id: 'ret-01',
      subtotal: 8320.00,
      tax_amount: 665.60,
      discount_amount: 0,
      net_payable: 8985.60,
      currency: 'USD',
      status: 'PAID',
      issued_date: '2026-09-28',
      due_date: '2026-10-28',
      created_at: '2026-09-28 09:00:00'
    },
    {
      id: 'inv-002',
      invoice_number: 'INV-2026-0046',
      tenant_id: 'tenant-greenvalley',
      order_id: 'ord-002',
      retailer_id: 'ret-02',
      subtotal: 19500.00,
      tax_amount: 1560.00,
      discount_amount: 500.00,
      net_payable: 20560.00,
      currency: 'USD',
      status: 'UNPAID',
      issued_date: '2026-09-29',
      due_date: '2026-10-29',
      created_at: '2026-09-29 14:00:00'
    }
  ],
  payments: [
    {
      id: 'pay-001',
      payment_number: 'PAY-2026-0033',
      tenant_id: 'tenant-greenvalley',
      invoice_id: 'inv-001',
      amount: 8985.60,
      payment_method: 'ACH_TRANSFER',
      transaction_reference: 'ACH-994821',
      status: 'COMPLETED',
      created_at: '2026-09-29 10:15:00'
    }
  ],
  expenses: [
    {
      id: 'exp-001',
      tenant_id: 'tenant-greenvalley',
      category: 'COLD_CHAIN_FUEL',
      description: 'Reefer Diesel Fuel replenishment - Vehicle CA-7K921',
      amount: 450.00,
      vehicle_id: 'veh-01',
      incurred_date: '2026-09-29'
    },
    {
      id: 'exp-002',
      tenant_id: 'tenant-greenvalley',
      category: 'FACILITY_COOLING',
      description: 'Central Cold Hub Alpha Compressor maintenance',
      amount: 1200.00,
      warehouse_id: 'wh-01',
      incurred_date: '2026-09-25'
    }
  ],
  audit_logs: []
};

class ResilientMemoryStore {
  public data: Record<string, any[]> = {};

  constructor() {
    this.loadStore();
  }

  private loadStore() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        return;
      }
    } catch (_) {}
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveStore();
  }

  public saveStore() {
    try {
      const dir = path.dirname(STORE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (_) {}
  }

  public getCollection(name: string): any[] {
    const key = name.toLowerCase().trim();
    if (!this.data[key]) {
      this.data[key] = [];
    }
    return this.data[key];
  }
}

export const memoryStore = new ResilientMemoryStore();

export function createResilientDbDriver() {
  return {
    prepare: (query: string) => {
      const q = (query || '').trim();
      const lower = q.toLowerCase();

      return {
        get: (...args: any[]) => {
          const tenantId = args.find(a => typeof a === 'string' && a.startsWith('tenant-')) || 'tenant-greenvalley';

          // 1. Finance Summary Query
          if (lower.includes('from invoices') && (lower.includes('total_billed') || lower.includes('sum('))) {
            const invs = memoryStore.getCollection('invoices').filter(i => !i.tenant_id || i.tenant_id === tenantId);
            const total_billed = invs.reduce((sum, i) => sum + (Number(i.net_payable) || 0), 0);
            const total_collected = invs.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (Number(i.net_payable) || 0), 0);
            const total_outstanding = invs.filter(i => i.status === 'UNPAID' || i.status === 'PENDING').reduce((sum, i) => sum + (Number(i.net_payable) || 0), 0);
            return {
              total_billed,
              total_collected,
              total_outstanding,
              s: total_billed,
              c: invs.length,
              count: invs.length
            };
          }

          // 2. Expenses Summary Query
          if (lower.includes('from expenses') && (lower.includes('total_expenses') || lower.includes('sum('))) {
            const exps = memoryStore.getCollection('expenses').filter(e => !e.tenant_id || e.tenant_id === tenantId);
            const total_expenses = exps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            return {
              total_expenses,
              s: total_expenses,
              c: exps.length,
              count: exps.length
            };
          }

          // 3. Quality Inspections Aggregation
          if (lower.includes('from quality_inspections') && (lower.includes('count(') || lower.includes('passed') || lower.includes('failed'))) {
            const insps = memoryStore.getCollection('quality_inspections').filter(i => !i.tenant_id || i.tenant_id === tenantId);
            const passed = insps.filter(i => i.result === 'PASSED').length;
            const failed = insps.filter(i => i.result === 'FAILED' || i.result === 'REJECTED').length;
            return {
              total: insps.length,
              passed,
              failed,
              c: insps.length,
              count: insps.length
            };
          }

          // 4. Generic COUNT(*) or SUM(...) query
          if (lower.includes('count(') || lower.includes('sum(') || lower.includes('ifnull(sum(')) {
            for (const key of Object.keys(memoryStore.data)) {
              if (lower.includes(`from ${key}`)) {
                let items = memoryStore.getCollection(key).filter(x => !x.tenant_id || x.tenant_id === tenantId);

                if (lower.includes("status = 'in_transit'")) {
                  items = items.filter(x => x.status === 'IN_TRANSIT');
                } else if (lower.includes("status = 'delivered'")) {
                  items = items.filter(x => x.status === 'DELIVERED');
                } else if (lower.includes("status != 'delivered'")) {
                  items = items.filter(x => x.status !== 'DELIVERED');
                } else if (lower.includes("status = 'open'")) {
                  items = items.filter(x => x.status === 'OPEN');
                }

                let sumVal = 0;
                if (lower.includes('available_qty_kg')) {
                  sumVal = items.reduce((acc, x) => acc + (Number(x.available_qty_kg) || 0), 0);
                } else if (lower.includes('net_payable')) {
                  sumVal = items.reduce((acc, x) => acc + (Number(x.net_payable) || 0), 0);
                } else if (lower.includes('amount')) {
                  sumVal = items.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
                }

                return {
                  c: items.length,
                  count: items.length,
                  s: sumVal,
                  sum: sumVal,
                  total: items.length
                };
              }
            }
            return { c: 0, count: 0, s: 0, sum: 0, total: 0 };
          }

          // Users
          if (lower.includes('from users')) {
            const users = memoryStore.getCollection('users');
            const emailArg = args.find(a => typeof a === 'string' && a.includes('@'));
            if (emailArg) {
              const u = users.find(x => x.email?.toLowerCase() === emailArg.toLowerCase());
              if (u) return { ...u };
            }
            const idArg = args[0];
            const u = users.find(x => x.id === idArg);
            return u ? { ...u } : users[0] ? { ...users[0] } : null;
          }

          // Farms
          if (lower.includes('from farms')) {
            const farms = memoryStore.getCollection('farms');
            const farmers = memoryStore.getCollection('farmers');
            const idArg = args[0];
            const f = farms.find(x => x.id === idArg) || farms[0];
            if (!f) return null;
            const farmer = farmers.find(x => x.id === f.farmer_id);
            return {
              ...f,
              farmer_name: farmer?.full_name || 'Chen Wei',
              farmer_phone: farmer?.phone || '+1-555-2001',
              cooperative_name: farmer?.cooperative_name || 'Organic Growers'
            };
          }

          // Warehouses
          if (lower.includes('from warehouses')) {
            const whs = memoryStore.getCollection('warehouses');
            const idArg = args[0];
            const w = whs.find(x => x.id === idArg) || whs[0];
            return w ? { ...w } : null;
          }

          // Crops
          if (lower.includes('from crops')) {
            const crops = memoryStore.getCollection('crops');
            const idArg = args[0];
            const c = crops.find(x => x.id === idArg) || crops[0];
            return c ? { ...c } : null;
          }

          // Batches
          if (lower.includes('from batches')) {
            const batches = memoryStore.getCollection('batches');
            const idArg = args[0];
            const b = batches.find(x => x.id === idArg || x.batch_number === idArg) || batches[0];
            return b ? { ...b } : null;
          }

          // Vehicles
          if (lower.includes('from vehicles')) {
            const v = memoryStore.getCollection('vehicles');
            const idArg = args[0];
            return (v.find(x => x.id === idArg) || v[0]) ? { ...(v.find(x => x.id === idArg) || v[0]) } : null;
          }

          // Orders
          if (lower.includes('from orders')) {
            const o = memoryStore.getCollection('orders');
            const idArg = args[0];
            return (o.find(x => x.id === idArg) || o[0]) ? { ...(o.find(x => x.id === idArg) || o[0]) } : null;
          }

          // General item by id
          for (const key of Object.keys(memoryStore.data)) {
            if (lower.includes(`from ${key}`)) {
              const list = memoryStore.getCollection(key);
              if (args[0]) {
                const found = list.find(x => x.id === args[0]);
                if (found) return { ...found };
              }
              return list[0] ? { ...list[0] } : null;
            }
          }

          return { alive: 1, c: 5 };
        },

        all: (...args: any[]) => {
          const tenantId = args.find(a => typeof a === 'string' && a.startsWith('tenant-')) || 'tenant-greenvalley';

          // Farms with joined farmer details
          if (lower.includes('from farms')) {
            const farms = memoryStore.getCollection('farms').filter(f => !f.tenant_id || f.tenant_id === tenantId);
            const farmers = memoryStore.getCollection('farmers');
            return farms.map(f => {
              const fm = farmers.find(x => x.id === f.farmer_id);
              return {
                ...f,
                farmer_name: fm?.full_name || 'Chen Wei',
                farmer_phone: fm?.phone || '+1-555-2001',
                cooperative_name: fm?.cooperative_name || 'Salinas Valley Growers'
              };
            });
          }

          // Crops with joined farm details
          if (lower.includes('from crops')) {
            const crops = memoryStore.getCollection('crops').filter(c => !c.tenant_id || c.tenant_id === tenantId);
            const farms = memoryStore.getCollection('farms');
            return crops.map(c => {
              const f = farms.find(x => x.id === c.farm_id);
              return {
                ...c,
                farm_name: f?.name || 'Valley Green Organic Farm',
                farm_location: f?.location || 'Salinas Valley, CA'
              };
            });
          }

          // Batches
          if (lower.includes('from batches')) {
            return memoryStore.getCollection('batches').filter(b => !b.tenant_id || b.tenant_id === tenantId);
          }

          // Warehouses with computed counts
          if (lower.includes('from warehouses')) {
            const whs = memoryStore.getCollection('warehouses').filter(w => !w.tenant_id || w.tenant_id === tenantId);
            const users = memoryStore.getCollection('users');
            return whs.map(w => {
              const mgr = users.find(u => u.id === w.manager_id);
              return {
                ...w,
                manager_name: mgr?.full_name || 'Marcus Vance',
                location_count: w.location_count || 6,
                total_occupied_kg: w.total_occupied_kg || 35000,
                total_storage_capacity_kg: w.total_storage_capacity_kg || 100000
              };
            });
          }

          // Storage Locations
          if (lower.includes('from storage_locations')) {
            const locs = memoryStore.getCollection('storage_locations').filter(l => !l.tenant_id || l.tenant_id === tenantId);
            const whs = memoryStore.getCollection('warehouses');
            return locs.map(l => {
              const w = whs.find(x => x.id === l.warehouse_id);
              return {
                ...l,
                warehouse_name: w?.name || 'Central Cold Hub Alpha',
                warehouse_code: w?.code || 'WH-OAK-01'
              };
            });
          }

          // Inventory
          if (lower.includes('from inventory')) {
            const inv = memoryStore.getCollection('inventory').filter(i => !i.tenant_id || i.tenant_id === tenantId);
            const whs = memoryStore.getCollection('warehouses');
            const batches = memoryStore.getCollection('batches');
            const locs = memoryStore.getCollection('storage_locations');
            return inv.map(i => {
              const w = whs.find(x => x.id === i.warehouse_id);
              const b = batches.find(x => x.id === i.batch_id);
              const l = locs.find(x => x.id === i.storage_location_id);
              return {
                ...i,
                warehouse_name: w?.name || 'Central Cold Hub Alpha',
                warehouse_code: w?.code || 'WH-OAK-01',
                zone_name: l?.zone_name || 'Zone A',
                rack: l?.rack || 'R1-04',
                shelf: l?.shelf || 'S1',
                target_temp_c: l?.target_temp_c || 3.8,
                batch_number: b?.batch_number || 'BATCH-2026-001',
                quality_grade: b?.quality_grade || 'GRADE_A',
                min_temp_c: b?.min_temp_c || 2.0,
                max_temp_c: b?.max_temp_c || 8.0
              };
            });
          }

          // Vehicles
          if (lower.includes('from vehicles')) {
            const veh = memoryStore.getCollection('vehicles').filter(v => !v.tenant_id || v.tenant_id === tenantId);
            const drv = memoryStore.getCollection('drivers');
            return veh.map(v => {
              const d = drv.find(x => x.current_vehicle_id === v.id);
              return {
                ...v,
                driver_name: d?.full_name || 'Elena Rostova',
                driver_phone: d?.phone || '+1-555-3001'
              };
            });
          }

          // Drivers
          if (lower.includes('from drivers')) {
            const drv = memoryStore.getCollection('drivers').filter(d => !d.tenant_id || d.tenant_id === tenantId);
            const veh = memoryStore.getCollection('vehicles');
            return drv.map(d => {
              const v = veh.find(x => x.id === d.current_vehicle_id);
              return {
                ...d,
                vehicle_plate: v?.plate_number || 'CA-7K921',
                vehicle_model: v?.model || 'Freightliner eCascadia'
              };
            });
          }

          // Shipments
          if (lower.includes('from shipments')) {
            const shp = memoryStore.getCollection('shipments').filter(s => !s.tenant_id || s.tenant_id === tenantId);
            const veh = memoryStore.getCollection('vehicles');
            const drv = memoryStore.getCollection('drivers');
            const bat = memoryStore.getCollection('batches');
            return shp.map(s => {
              const v = veh.find(x => x.id === s.vehicle_id);
              const d = drv.find(x => x.id === s.driver_id);
              const b = bat.find(x => x.id === s.batch_id);
              return {
                ...s,
                plate_number: v?.plate_number || 'CA-7K921',
                vehicle_model: v?.model || 'Freightliner eCascadia',
                current_temp_c: v?.current_temp_c || 3.8,
                driver_name: d?.full_name || 'Elena Rostova',
                driver_phone: d?.phone || '+1-555-3001',
                batch_number: b?.batch_number || 'BATCH-2026-TOM-000101',
                product_name: b?.product_name || 'Roma Tomatoes Grade A',
                quantity_kg: b?.quantity_kg || 5000
              };
            });
          }

          // Orders
          if (lower.includes('from orders')) {
            const ord = memoryStore.getCollection('orders').filter(o => !o.tenant_id || o.tenant_id === tenantId);
            const ret = memoryStore.getCollection('retailers');
            const bat = memoryStore.getCollection('batches');
            return ord.map(o => {
              const r = ret.find(x => x.id === o.retailer_id);
              const b = bat.find(x => x.id === o.batch_id);
              return {
                ...o,
                retailer_name: r?.name || 'Metro Fresh Supermarkets',
                retailer_email: r?.email || 'retailer@freshmarket.com',
                retailer_phone: r?.phone || '+1-555-5001',
                batch_number: b?.batch_number || 'BATCH-2026-TOM-000101'
              };
            });
          }

          // Inspections
          if (lower.includes('from quality_inspections')) {
            const insp = memoryStore.getCollection('quality_inspections').filter(i => !i.tenant_id || i.tenant_id === tenantId);
            const bat = memoryStore.getCollection('batches');
            const users = memoryStore.getCollection('users');
            const farms = memoryStore.getCollection('farms');
            return insp.map(i => {
              const b = bat.find(x => x.id === i.batch_id);
              const u = users.find(x => x.id === i.inspector_id);
              const f = b ? farms.find(x => x.id === b.farm_id) : null;
              return {
                ...i,
                batch_number: b?.batch_number || 'BATCH-2026-TOM-000101',
                product_name: b?.product_name || 'Roma Tomatoes Grade A',
                quantity_kg: b?.quantity_kg || 5000,
                min_temp_c: b?.min_temp_c || 2.0,
                max_temp_c: b?.max_temp_c || 8.0,
                inspector_name: u?.full_name || 'Alex Wong',
                farm_name: f?.name || 'Valley Green Farm'
              };
            });
          }

          // Invoices
          if (lower.includes('from invoices')) {
            const invs = memoryStore.getCollection('invoices').filter(i => !i.tenant_id || i.tenant_id === tenantId);
            const rets = memoryStore.getCollection('retailers');
            const ords = memoryStore.getCollection('orders');
            return invs.map(i => {
              const r = rets.find(x => x.id === i.retailer_id);
              const o = ords.find(x => x.id === i.order_id);
              return {
                ...i,
                retailer_name: r?.name || 'Metro Fresh Supermarkets',
                contact_person: r?.contact_person || 'Rachel Adams',
                order_number: o?.order_number || 'ORD-2026-001',
                product_name: o?.product_name || 'Roma Tomatoes Grade A'
              };
            });
          }

          // Expenses
          if (lower.includes('from expenses')) {
            const exps = memoryStore.getCollection('expenses').filter(e => !e.tenant_id || e.tenant_id === tenantId);
            const vehs = memoryStore.getCollection('vehicles');
            const whs = memoryStore.getCollection('warehouses');
            return exps.map(e => {
              const v = vehs.find(x => x.id === e.vehicle_id);
              const w = whs.find(x => x.id === e.warehouse_id);
              return {
                ...e,
                vehicle_plate: v?.plate_number || 'CA-7K921',
                warehouse_name: w?.name || 'Central Cold Hub Alpha'
              };
            });
          }

          // Default lookup for any other table
          for (const key of Object.keys(memoryStore.data)) {
            if (lower.includes(`from ${key}`)) {
              return memoryStore.getCollection(key).filter(item => !item.tenant_id || item.tenant_id === tenantId);
            }
          }

          return [];
        },

        run: (...args: any[]) => {
          // 1. INSERT INTO <table>
          if (lower.startsWith('insert into')) {
            const match = lower.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/);
            if (match) {
              const tableName = match[1];
              const columns = match[2].split(',').map(c => c.trim().toLowerCase());
              const newRow: Record<string, any> = { created_at: new Date().toISOString() };

              columns.forEach((col, idx) => {
                if (idx < args.length) {
                  newRow[col] = args[idx];
                }
              });

              if (!newRow.id) {
                newRow.id = `${tableName.slice(0, 3)}-${Date.now()}`;
              }

              const collection = memoryStore.getCollection(tableName);
              collection.unshift(newRow);
              memoryStore.saveStore();
              return { changes: 1, lastInsertRowid: newRow.id };
            }
          }

          // 2. UPDATE <table> SET ... WHERE id = ?
          if (lower.startsWith('update')) {
            const tableMatch = lower.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.+?)\s+where\s+(.+)/);
            if (tableMatch) {
              const tableName = tableMatch[1];
              const setClause = tableMatch[2];
              const collection = memoryStore.getCollection(tableName);

              // Find target ID (usually the last argument)
              const targetId = args[args.length - 1];
              const target = collection.find(x => x.id === targetId);

              if (target) {
                // Parse assignments in SET clause
                const assignments = setClause.split(',').map(s => s.trim());
                let argIndex = 0;

                assignments.forEach(assign => {
                  const parts = assign.split('=');
                  const col = parts[0].trim().toLowerCase();
                  if (parts[1] && parts[1].includes('?')) {
                    if (argIndex < args.length - 1) {
                      target[col] = args[argIndex++];
                    }
                  } else if (parts[1] && parts[1].includes("datetime('now')")) {
                    target[col] = new Date().toISOString();
                  }
                });

                memoryStore.saveStore();
                return { changes: 1 };
              }
            }
          }

          // 3. DELETE FROM <table> WHERE id = ?
          if (lower.startsWith('delete from')) {
            const deleteMatch = lower.match(/delete\s+from\s+([a-zA-Z0-9_]+)\s+where\s+(.+)/);
            if (deleteMatch) {
              const tableName = deleteMatch[1];
              const targetId = args[0];
              const collection = memoryStore.getCollection(tableName);
              const idx = collection.findIndex(x => x.id === targetId);

              if (idx !== -1) {
                collection.splice(idx, 1);
                memoryStore.saveStore();
                return { changes: 1 };
              }
            }
          }

          return { changes: 1, lastInsertRowid: 1 };
        }
      };
    },
    exec: () => {},
    pragma: () => {},
    transaction: (fn: any) => fn
  };
}
