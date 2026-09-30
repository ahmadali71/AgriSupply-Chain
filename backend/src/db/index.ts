// import Database from 'better-sqlite3'; (avoid static C++ native bind at startup)
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schema.js';

let DatabaseConstructor: any = null;
try {
  DatabaseConstructor = require('better-sqlite3');
} catch (e: any) {
  console.warn('[DB] better-sqlite3 native driver not available in serverless runtime:', e.message);
}

const isVercel = Boolean(process.env.VERCEL);
let dbPath = process.env.DATABASE_PATH || '';

if (!dbPath) {
  if (isVercel) {
    dbPath = path.join('/tmp', 'agrisupply.db');
    if (!fs.existsSync(dbPath)) {
      const candidates = [
        path.join(process.cwd(), 'data', 'agrisupply.db'),
        path.join(process.cwd(), 'backend', 'data', 'agrisupply.db'),
        path.join(__dirname, '../../data/agrisupply.db'),
        path.join(__dirname, '../data/agrisupply.db')
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            fs.copyFileSync(cand, dbPath);
            console.log(`[DB VERCEL] Copied pre-seeded database from ${cand} to /tmp/agrisupply.db`);
            break;
          } catch (e) {
            console.warn('[DB VERCEL] Failed to copy seed db:', e);
          }
        }
      }
    }
  } else {
    dbPath = path.join(process.cwd(), 'data', 'agrisupply.db');
  }
}

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) { /* ignore */ }
}

let dbInstance: any;

if (DatabaseConstructor) {
  try {
    dbInstance = new DatabaseConstructor(dbPath);
    try {
      dbInstance.pragma('journal_mode = WAL');
      dbInstance.pragma('foreign_keys = ON');
    } catch (pe) {
      console.warn('[DB] Pragma setting warning:', pe);
    }
  } catch (err: any) {
    console.warn('[DB] DatabaseConstructor failed:', err.message);
  }
}

const DEMO_BCRYPT_HASH = '$2a$10$mB7priheKVUx3ZMet4CjUOzIlrwms0cIAAsu0ptIP6OBn56aL1xsK'; // bcrypt of 'password123'

const DEMO_USERS = [
  { id: 'usr-superadmin', tenant_id: 'tenant-greenvalley', email: 'admin@agrisupply.com', password_hash: DEMO_BCRYPT_HASH, role: 'SUPER_ADMIN', full_name: 'Arthur Vance (Super Admin)', phone: '+1-555-1000', status: 'ACTIVE', assigned_tabs: '["*"]' },
  { id: 'usr-farmer', tenant_id: 'tenant-greenvalley', email: 'farmer.chen@agrisupply.com', password_hash: DEMO_BCRYPT_HASH, role: 'FARMER', full_name: 'Chen Wei (Organic Farmer)', phone: '+1-555-2001', status: 'ACTIVE', assigned_tabs: '["dashboard","farms","crops","batches","inspections","traceability","orders"]' },
  { id: 'usr-driver', tenant_id: 'tenant-greenvalley', email: 'elena.driver@agrisupply.com', password_hash: DEMO_BCRYPT_HASH, role: 'DRIVER', full_name: 'Elena Rostova (Fleet Driver)', phone: '+1-555-3001', status: 'ACTIVE', assigned_tabs: '["dashboard","driver-portal","live-tracking","shipments","deliveries"]' },
  { id: 'usr-warehouse', tenant_id: 'tenant-greenvalley', email: 'marcus.warehouse@agrisupply.com', password_hash: DEMO_BCRYPT_HASH, role: 'WAREHOUSE_MANAGER', full_name: 'Marcus Vance (Cold-Hub Lead)', phone: '+1-555-4001', status: 'ACTIVE', assigned_tabs: '["dashboard","inventory","warehouses","sensors","alerts","batches","orders","deliveries","reports"]' },
  { id: 'usr-retailer', tenant_id: 'tenant-greenvalley', email: 'retailer@freshmarket.com', password_hash: DEMO_BCRYPT_HASH, role: 'RETAILER', full_name: 'FreshMarket Organic Store', phone: '+1-555-5001', status: 'ACTIVE', assigned_tabs: '["dashboard","orders","deliveries","invoices","traceability","live-tracking"]' }
];

const DEMO_WAREHOUSES = [
  { id: 'wh-fresno-01', tenant_id: 'tenant-greenvalley', name: 'Fresno Cold Hub Alpha', code: 'FRESNO-A', address: '1420 Chilled Way, Fresno, CA', latitude: 36.7468, longitude: -119.7726, total_capacity_sqft: 65000, total_cold_rooms: 6, status: 'ACTIVE', manager_name: 'Marcus Vance', location_count: 12, total_occupied_kg: 35000, total_storage_capacity_kg: 100000 },
  { id: 'wh-sac-02', tenant_id: 'tenant-greenvalley', name: 'Sacramento Sub-Zero Hub', code: 'SAC-B', address: '800 IceBox Rd, Sacramento, CA', latitude: 38.5816, longitude: -121.4944, total_capacity_sqft: 85000, total_cold_rooms: 8, status: 'ACTIVE', manager_name: 'Marcus Vance', location_count: 16, total_occupied_kg: 52000, total_storage_capacity_kg: 140000 },
  { id: 'wh-bakers-03', tenant_id: 'tenant-greenvalley', name: 'Bakersfield Agro Storage', code: 'BAK-C', address: '210 SubZero Ave, Bakersfield, CA', latitude: 35.3733, longitude: -119.0187, total_capacity_sqft: 50000, total_cold_rooms: 4, status: 'ACTIVE', manager_name: 'Marcus Vance', location_count: 8, total_occupied_kg: 21000, total_storage_capacity_kg: 75000 }
];

const DEMO_VEHICLES = [
  { id: 'veh-01', tenant_id: 'tenant-greenvalley', plate_number: 'CA-REEFER-01', model: 'Freightliner Cascadia 126 ThermoKing', capacity_kg: 18000, current_temp_c: 3.8, min_temp_c: 2.0, max_temp_c: 6.0, status: 'IN_TRANSIT', driver_name: 'Elena Rostova', fuel_level_pct: 82, battery_health_pct: 98 },
  { id: 'veh-02', tenant_id: 'tenant-greenvalley', plate_number: 'CA-REEFER-02', model: 'Volvo VNL 760 Carrier Transicold', capacity_kg: 22000, current_temp_c: 4.1, min_temp_c: 3.0, max_temp_c: 7.0, status: 'IN_TRANSIT', driver_name: 'Carlos Mendez', fuel_level_pct: 91, battery_health_pct: 95 },
  { id: 'veh-03', tenant_id: 'tenant-greenvalley', plate_number: 'CA-REEFER-03', model: 'Kenworth T680 Reefer', capacity_kg: 15000, current_temp_c: 2.5, min_temp_c: 1.5, max_temp_c: 5.0, status: 'MAINTENANCE', driver_name: 'Marcus Brody', fuel_level_pct: 64, battery_health_pct: 90 }
];

const DEMO_INVENTORY = [
  { id: 'inv-01', tenant_id: 'tenant-greenvalley', product_name: 'Organic Strawberries', batch_number: 'BATCH-2026-STR-01', warehouse_id: 'wh-fresno-01', warehouse_name: 'Fresno Cold Hub Alpha', warehouse_code: 'FRESNO-A', zone_name: 'Chilled Zone A', rack: 'R1-04', shelf: 'S1', target_temp_c: 3.5, available_qty_kg: 4200, reserved_qty_kg: 800, damaged_qty_kg: 0, unit: 'KG', expiry_date: '2026-10-15', status: 'IN_STORAGE', quality_grade: 'GRADE_A' },
  { id: 'inv-02', tenant_id: 'tenant-greenvalley', product_name: 'Hass Avocados', batch_number: 'BATCH-2026-AVO-02', warehouse_id: 'wh-sac-02', warehouse_name: 'Sacramento Sub-Zero Hub', warehouse_code: 'SAC-B', zone_name: 'Zone C (3°C)', rack: 'R3-12', shelf: 'S2', target_temp_c: 4.0, available_qty_kg: 8500, reserved_qty_kg: 1200, damaged_qty_kg: 0, unit: 'KG', expiry_date: '2026-10-28', status: 'IN_STORAGE', quality_grade: 'GRADE_A' },
  { id: 'inv-03', tenant_id: 'tenant-greenvalley', product_name: 'Crisp Romaine Lettuce', batch_number: 'BATCH-2026-LET-03', warehouse_id: 'wh-bakers-03', warehouse_name: 'Bakersfield Agro Storage', warehouse_code: 'BAK-C', zone_name: 'Zone B (2°C)', rack: 'R2-08', shelf: 'S3', target_temp_c: 2.0, available_qty_kg: 3100, reserved_qty_kg: 400, damaged_qty_kg: 0, unit: 'KG', expiry_date: '2026-10-09', status: 'IN_STORAGE', quality_grade: 'GRADE_A' }
];

import { createResilientDbDriver } from './mockStore.js';

if (!dbInstance) {
  console.warn('[DB] Native better-sqlite3 not initialized, activating resilient serverless store with persistent JSON/memory engine');
  dbInstance = createResilientDbDriver();
}

export const db = dbInstance;

export function initDatabase() {
  try {
    db.exec(SCHEMA_SQL);
    console.log('[DB] Schema initialized successfully at', dbPath);
  } catch (err: any) {
    console.warn('[DB] Schema init warning:', err.message);
  }
}

export default db;
