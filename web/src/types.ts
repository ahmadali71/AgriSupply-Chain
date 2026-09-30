export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  full_name: string;
  phone?: string;
  status: string;
  two_factor_enabled?: number;
  last_login?: string;
  assigned_tabs?: string[];
  is_online?: boolean;
  documents_count?: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  contact_email: string;
  contact_phone?: string;
  settings_json?: string;
}

export interface Farm {
  id: string;
  tenant_id: string;
  farmer_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  size_acres: number;
  crop_types: string;
  capacity_tons: number;
  irrigation_type: string;
  certification: string;
  contact_phone?: string;
  farmer_name?: string;
  farmer_phone?: string;
  cooperative_name?: string;
  status: string;
  created_at: string;
}

export interface Crop {
  id: string;
  tenant_id: string;
  farm_id: string;
  name: string;
  variety: string;
  season: string;
  planting_date: string;
  expected_harvest_date: string;
  actual_harvest_date?: string;
  estimated_qty_kg: number;
  actual_qty_kg: number;
  quality_grade: string;
  lifecycle_status: string;
  farm_name?: string;
}

export interface Harvest {
  id: string;
  tenant_id: string;
  crop_id: string;
  farm_id: string;
  harvest_date: string;
  yield_kg: number;
  grade: string;
  weather_condition?: string;
  notes?: string;
  crop_name?: string;
  farm_name?: string;
}

export interface Batch {
  id: string;
  batch_number: string;
  tenant_id: string;
  crop_id: string;
  farm_id: string;
  harvest_id: string;
  product_name: string;
  quantity_kg: number;
  available_kg: number;
  unit: string;
  quality_grade: string;
  harvest_date: string;
  expiry_date: string;
  storage_type: string;
  min_temp_c: number;
  max_temp_c: number;
  current_location: string;
  status: string;
  qr_code_data: string;
  farm_name?: string;
  created_at: string;
}

export interface QualityInspection {
  id: string;
  tenant_id: string;
  batch_id: string;
  inspector_id: string;
  inspection_date: string;
  product_type: string;
  visual_score: number;
  weight_kg: number;
  size_mm: number;
  moisture_pct: number;
  measured_temp_c: number;
  packaging_integrity: string;
  contamination_detected: number;
  damage_pct: number;
  conditional_notes?: string;
  corrective_action?: string;
  result: 'PASSED' | 'FAILED' | 'CONDITIONAL';
  inspector_signature?: string;
  inspector_notes?: string;
  images_json?: string;
  gps_lat?: number;
  gps_lng?: number;
  batch_number?: string;
  product_name?: string;
  inspector_name?: string;
  farm_name?: string;
  min_temp_c?: number;
  max_temp_c?: number;
}

export interface Warehouse {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  total_capacity_sqft: number;
  total_cold_rooms: number;
  active_alerts_count: number;
  manager_name?: string;
  location_count?: number;
  total_occupied_kg?: number;
  total_storage_capacity_kg?: number;
  status: string;
}

export interface StorageLocation {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  zone_name: string;
  rack: string;
  shelf: string;
  cold_room_id?: string;
  is_cold_storage: number;
  capacity_kg: number;
  current_occupancy_kg: number;
  target_temp_c: number;
  target_humidity_pct: number;
  status: string;
  warehouse_name?: string;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  storage_location_id: string;
  batch_id: string;
  product_name: string;
  available_qty_kg: number;
  reserved_qty_kg: number;
  damaged_qty_kg: number;
  unit: string;
  expiry_date: string;
  status: string;
  warehouse_name?: string;
  zone_name?: string;
  rack?: string;
  shelf?: string;
  target_temp_c?: number;
  batch_number?: string;
  quality_grade?: string;
  min_temp_c?: number;
  max_temp_c?: number;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  plate_number: string;
  model: string;
  capacity_kg: number;
  is_refrigerated: number;
  min_temp_c: number;
  max_temp_c: number;
  current_lat: number;
  current_lng: number;
  current_speed_kmh: number;
  current_temp_c: number;
  fuel_pct: number;
  battery_pct: number;
  status: string;
  driver_name?: string;
}

export interface Driver {
  id: string;
  tenant_id: string;
  user_id?: string;
  full_name: string;
  license_number: string;
  phone: string;
  status: string;
  current_vehicle_id?: string;
  vehicle_plate?: string;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  tenant_id: string;
  order_id?: string;
  batch_id: string;
  vehicle_id: string;
  driver_id: string;
  origin_type: string;
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_type: string;
  destination_name: string;
  destination_lat: number;
  destination_lng: number;
  departure_time?: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  status: string;
  required_min_temp_c: number;
  required_max_temp_c: number;
  temperature_status: string;
  distance_km: number;
  plate_number?: string;
  driver_name?: string;
  product_name?: string;
  batch_number?: string;
  current_temp_c?: number;
}

export interface Order {
  id: string;
  order_number: string;
  tenant_id: string;
  retailer_id: string;
  product_name: string;
  batch_id?: string;
  requested_qty_kg: number;
  unit_price: number;
  total_amount: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  required_delivery_date: string;
  status: string;
  pipeline_stage: string;
  priority: string;
  retailer_name?: string;
  batch_number?: string;
  created_at: string;
}

export interface Sensor {
  id: string;
  sensor_code: string;
  tenant_id: string;
  sensor_type: string;
  attached_type: string;
  attached_id: string;
  min_threshold: number;
  max_threshold: number;
  current_value: number;
  secondary_value?: number;
  battery_pct: number;
  status: string;
  attached_name?: string;
  last_heartbeat?: string;
}

export interface TemperatureAlert {
  id: string;
  tenant_id: string;
  sensor_id?: string;
  shipment_id?: string;
  warehouse_id?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  alert_type: string;
  message: string;
  reading_value: number;
  threshold_value: number;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  sensor_code?: string;
  vehicle_plate?: string;
  warehouse_name?: string;
  timestamp: string;
}

export interface Geofence {
  id: string;
  tenant_id: string;
  name: string;
  zone_type: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  coordinates_json?: string;
}

export interface DeliveryReceipt {
  id: string;
  receipt_number: string;
  shipment_id: string;
  order_id: string;
  tenant_id: string;
  receiver_name: string;
  receiver_signature_data: string;
  receiver_photo_url?: string;
  gps_lat: number;
  gps_lng: number;
  delivered_qty_kg: number;
  damaged_qty_kg: number;
  delivery_notes?: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  tenant_id: string;
  order_id: string;
  retailer_id: string;
  total_amount: number;
  tax_amount: number;
  transport_charges: number;
  warehouse_charges: number;
  net_payable: number;
  status: string;
  due_date: string;
  issued_date: string;
  retailer_name?: string;
}
