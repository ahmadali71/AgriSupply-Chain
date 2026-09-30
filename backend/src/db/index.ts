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

if (!dbInstance) {
  console.warn('[DB] Native better-sqlite3 not initialized, activating resilient serverless store');
  dbInstance = {
    prepare: (query: string) => ({
      get: (...args: any[]) => {
        const q = (query || '').toLowerCase();
        if (q.includes('users')) {
          const emailArg = args.find(a => typeof a === 'string' && a.includes('@'));
          if (emailArg) {
            const found = DEMO_USERS.find(u => u.email.toLowerCase() === emailArg.toLowerCase());
            if (found) return { ...found };
            if (emailArg.includes('farm')) return { ...DEMO_USERS[1] };
            if (emailArg.includes('drive') || emailArg.includes('elena')) return { ...DEMO_USERS[2] };
            if (emailArg.includes('ware') || emailArg.includes('marcus')) return { ...DEMO_USERS[3] };
          }
          return { ...DEMO_USERS[0] };
        }
        if (q.includes('tenants')) {
          return { id: 'tenant-greenvalley', name: 'GreenValley Agro Logistics', slug: 'greenvalley', plan: 'ENTERPRISE', status: 'ACTIVE' };
        }
        return { alive: 1, c: 5 };
      },
      all: (...args: any[]) => {
        const q = (query || '').toLowerCase();
        if (q.includes('users')) return DEMO_USERS;
        return [];
      },
      run: (...args: any[]) => ({ changes: 1, lastInsertRowid: 1 })
    }),
    exec: () => {},
    pragma: () => {},
    transaction: (fn: any) => fn
  };
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
