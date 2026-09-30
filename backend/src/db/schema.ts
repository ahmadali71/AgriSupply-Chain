export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- 1. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'ENTERPRISE',
  status TEXT DEFAULT 'ACTIVE',
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  settings_json TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'ACTIVE',
  two_factor_enabled INTEGER DEFAULT 0,
  two_factor_secret TEXT,
  failed_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  last_login DATETIME,
  assigned_tabs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, email)
);

-- 3. Roles and Permissions
CREATE TABLE IF NOT EXISTS roles_permissions (
  role TEXT PRIMARY KEY,
  description TEXT,
  permissions_json TEXT NOT NULL
);

-- 4. Farmers
CREATE TABLE IF NOT EXISTS farmers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  national_id TEXT,
  address TEXT,
  experience_years INTEGER DEFAULT 5,
  cooperative_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Farms
CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  size_acres REAL NOT NULL,
  crop_types TEXT NOT NULL,
  capacity_tons REAL NOT NULL,
  irrigation_type TEXT DEFAULT 'DRIP',
  certification TEXT DEFAULT 'ORGANIC_CERTIFIED',
  contact_phone TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

-- 6. Crops
CREATE TABLE IF NOT EXISTS crops (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  variety TEXT NOT NULL,
  season TEXT NOT NULL,
  planting_date TEXT NOT NULL,
  expected_harvest_date TEXT NOT NULL,
  actual_harvest_date TEXT,
  estimated_qty_kg REAL NOT NULL,
  actual_qty_kg REAL DEFAULT 0,
  quality_grade TEXT DEFAULT 'GRADE_A',
  lifecycle_status TEXT DEFAULT 'GROWING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- 7. Harvests
CREATE TABLE IF NOT EXISTS harvests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  crop_id TEXT NOT NULL,
  farm_id TEXT NOT NULL,
  harvest_date TEXT NOT NULL,
  yield_kg REAL NOT NULL,
  grade TEXT DEFAULT 'GRADE_A',
  weather_condition TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- 8. Batches
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  crop_id TEXT NOT NULL,
  farm_id TEXT NOT NULL,
  harvest_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity_kg REAL NOT NULL,
  available_kg REAL NOT NULL,
  unit TEXT DEFAULT 'KG',
  quality_grade TEXT DEFAULT 'GRADE_A',
  harvest_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  storage_type TEXT DEFAULT 'COLD_STORAGE',
  min_temp_c REAL DEFAULT 2.0,
  max_temp_c REAL DEFAULT 8.0,
  current_location TEXT DEFAULT 'FARM_GATE',
  status TEXT DEFAULT 'CREATED',
  qr_code_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (harvest_id) REFERENCES harvests(id) ON DELETE CASCADE
);

-- 9. Dynamic Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  inspector_id TEXT NOT NULL,
  inspection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  product_type TEXT NOT NULL,
  visual_score REAL NOT NULL,
  weight_kg REAL NOT NULL,
  size_mm REAL NOT NULL,
  moisture_pct REAL NOT NULL,
  measured_temp_c REAL NOT NULL,
  packaging_integrity TEXT NOT NULL,
  contamination_detected INTEGER DEFAULT 0,
  damage_pct REAL DEFAULT 0,
  conditional_notes TEXT,
  corrective_action TEXT,
  result TEXT NOT NULL, -- 'PASSED' | 'FAILED' | 'CONDITIONAL'
  inspector_signature TEXT,
  inspector_notes TEXT,
  images_json TEXT DEFAULT '[]',
  gps_lat REAL,
  gps_lng REAL,
  report_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  total_capacity_sqft REAL NOT NULL,
  total_cold_rooms INTEGER DEFAULT 4,
  active_alerts_count INTEGER DEFAULT 0,
  manager_id TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Storage Locations
CREATE TABLE IF NOT EXISTS storage_locations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  rack TEXT NOT NULL,
  shelf TEXT NOT NULL,
  cold_room_id TEXT,
  is_cold_storage INTEGER DEFAULT 1,
  capacity_kg REAL NOT NULL,
  current_occupancy_kg REAL DEFAULT 0,
  target_temp_c REAL DEFAULT 4.0,
  target_humidity_pct REAL DEFAULT 85.0,
  status TEXT DEFAULT 'OPTIMAL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- 12. Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  storage_location_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  available_qty_kg REAL NOT NULL,
  reserved_qty_kg REAL DEFAULT 0,
  damaged_qty_kg REAL DEFAULT 0,
  unit TEXT DEFAULT 'KG',
  expiry_date TEXT NOT NULL,
  status TEXT DEFAULT 'IN_STORAGE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- 13. Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  storage_location_id TEXT,
  transaction_type TEXT NOT NULL, -- 'STOCK_IN', 'STOCK_OUT', 'TRANSFER', 'ADJUSTMENT', 'RESERVATION'
  quantity_kg REAL NOT NULL,
  reason TEXT,
  user_id TEXT,
  reference_order_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- 14. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plate_number TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  capacity_kg REAL NOT NULL,
  is_refrigerated INTEGER DEFAULT 1,
  min_temp_c REAL DEFAULT 1.0,
  max_temp_c REAL DEFAULT 8.0,
  current_lat REAL,
  current_lng REAL,
  current_speed_kmh REAL DEFAULT 0,
  current_temp_c REAL DEFAULT 4.2,
  fuel_pct REAL DEFAULT 90,
  battery_pct REAL DEFAULT 95,
  status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 15. Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  full_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'ON_TRIP', 'OFF_DUTY'
  current_vehicle_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (current_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- 16. Retailers
CREATE TABLE IF NOT EXISTS retailers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  tax_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 17. Retailer Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  retailer_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  batch_id TEXT,
  requested_qty_kg REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat REAL,
  delivery_lng REAL,
  required_delivery_date TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  pipeline_stage TEXT DEFAULT 'NEW', 
  priority TEXT DEFAULT 'MEDIUM',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

-- 18. Shipments
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  shipment_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  order_id TEXT,
  batch_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  origin_type TEXT NOT NULL, -- 'FARM' | 'WAREHOUSE'
  origin_name TEXT NOT NULL,
  origin_lat REAL NOT NULL,
  origin_lng REAL NOT NULL,
  destination_type TEXT NOT NULL, -- 'WAREHOUSE' | 'RETAILER'
  destination_name TEXT NOT NULL,
  destination_lat REAL NOT NULL,
  destination_lng REAL NOT NULL,
  departure_time DATETIME,
  estimated_arrival DATETIME,
  actual_arrival DATETIME,
  status TEXT DEFAULT 'READY', -- 'READY', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
  required_min_temp_c REAL DEFAULT 2.0,
  required_max_temp_c REAL DEFAULT 8.0,
  temperature_status TEXT DEFAULT 'NORMAL', -- 'NORMAL', 'WARNING', 'CRITICAL'
  route_polyline TEXT,
  distance_km REAL DEFAULT 45.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- 19. Shipment Stops
CREATE TABLE IF NOT EXISTS shipment_stops (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  stop_order INTEGER NOT NULL,
  location_name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  estimated_time DATETIME,
  actual_time DATETIME,
  status TEXT DEFAULT 'PENDING',
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- 20. GPS Locations
CREATE TABLE IF NOT EXISTS gps_locations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  shipment_id TEXT,
  vehicle_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  speed_kmh REAL DEFAULT 0,
  heading REAL DEFAULT 0,
  altitude REAL DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 21. Geofences
CREATE TABLE IF NOT EXISTS geofences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL, -- 'WAREHOUSE', 'DELIVERY', 'RESTRICTED', 'FARM', 'COLD_STORAGE'
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_meters REAL NOT NULL,
  coordinates_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 22. Geofence Events
CREATE TABLE IF NOT EXISTS geofence_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  geofence_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  shipment_id TEXT,
  event_type TEXT NOT NULL, -- 'VEHICLE_ENTERED_ZONE', 'VEHICLE_LEFT_ZONE', 'UNAUTHORIZED_ZONE', 'DELIVERY_ZONE_REACHED'
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (geofence_id) REFERENCES geofences(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL
);

-- 23. IoT Sensors
CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  sensor_code TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  sensor_type TEXT NOT NULL, -- 'TEMPERATURE', 'HUMIDITY', 'DOOR', 'GPS', 'POWER'
  attached_type TEXT NOT NULL, -- 'WAREHOUSE' | 'VEHICLE'
  attached_id TEXT NOT NULL,
  min_threshold REAL,
  max_threshold REAL,
  current_value REAL,
  secondary_value REAL,
  battery_pct REAL DEFAULT 100,
  last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'ONLINE', -- 'ONLINE', 'OFFLINE', 'WARNING', 'CRITICAL'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 24. Sensor Readings History
CREATE TABLE IF NOT EXISTS sensor_readings (
  id TEXT PRIMARY KEY,
  sensor_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  reading_type TEXT NOT NULL,
  value REAL NOT NULL,
  secondary_value REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 25. Temperature & Cold Chain Alerts
CREATE TABLE IF NOT EXISTS temperature_alerts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sensor_id TEXT,
  shipment_id TEXT,
  warehouse_id TEXT,
  severity TEXT NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
  alert_type TEXT NOT NULL, -- 'TEMP_EXCURSION', 'DOOR_OPEN', 'BATTERY_LOW', 'OFFLINE', 'ROUTE_DEVIATION'
  message TEXT NOT NULL,
  reading_value REAL,
  threshold_value REAL,
  status TEXT DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'
  acknowledged_by TEXT,
  resolved_by TEXT,
  resolution_notes TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE SET NULL,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
);

-- 26. Proof of Delivery
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  shipment_id TEXT NOT NULL,
  order_id TEXT,
  tenant_id TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_signature_data TEXT NOT NULL,
  receiver_photo_url TEXT,
  gps_lat REAL NOT NULL,
  gps_lng REAL NOT NULL,
  delivered_qty_kg REAL NOT NULL,
  damaged_qty_kg REAL DEFAULT 0,
  delivery_notes TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 27. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  retailer_id TEXT NOT NULL,
  total_amount REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  transport_charges REAL DEFAULT 0,
  warehouse_charges REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  net_payable REAL NOT NULL,
  status TEXT DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'
  due_date TEXT NOT NULL,
  issued_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE
);

-- 28. Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT DEFAULT 'BANK_TRANSFER',
  transaction_reference TEXT,
  status TEXT DEFAULT 'COMPLETED',
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- 29. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'FUEL', 'COLD_STORAGE_POWER', 'MAINTENANCE', 'LOGISTICS', 'PACKAGING'
  amount REAL NOT NULL,
  description TEXT,
  vehicle_id TEXT,
  warehouse_id TEXT,
  incurred_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 30. Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'CERTIFICATE', 'INSPECTION', 'INVOICE', 'POD', 'WAYBILL'
  related_type TEXT,
  related_id TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_data_base64 TEXT,
  uploaded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 31. Immutable Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT DEFAULT '127.0.0.1',
  device_info TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 32. Offline Sync Queue
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  client_sync_id TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  payload TEXT NOT NULL,
  client_timestamp DATETIME NOT NULL,
  server_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'SYNCED', -- 'SYNCED', 'CONFLICT', 'FAILED'
  conflict_resolution TEXT
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_batches_tenant ON batches(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id, status, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant ON shipments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sensors_tenant ON sensors(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_readings_sensor ON sensor_readings(sensor_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON temperature_alerts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_inventory_batch ON inventory(batch_id, warehouse_id);
`;
