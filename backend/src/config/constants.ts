export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  FARMER: 'FARMER',
  FARM_MANAGER: 'FARM_MANAGER',
  QUALITY_INSPECTOR: 'QUALITY_INSPECTOR',
  TRANSPORT_MANAGER: 'TRANSPORT_MANAGER',
  DRIVER: 'DRIVER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  RETAILER: 'RETAILER',
  FINANCE_OFFICER: 'FINANCE_OFFICER'
} as const;

export type UserRole = keyof typeof USER_ROLES;

export const PIPELINE_STAGES = [
  'NEW',
  'QUALITY_CHECK',
  'APPROVED',
  'READY',
  'IN_TRANSIT',
  'WAREHOUSE',
  'PROCESSING',
  'DISPATCHED',
  'DELIVERED'
] as const;

export const BATCH_STATUSES = [
  'CREATED',
  'INSPECTION_PENDING',
  'APPROVED',
  'REJECTED',
  'READY_FOR_TRANSPORT',
  'IN_TRANSIT',
  'IN_WAREHOUSE',
  'IN_STORAGE',
  'ALLOCATED',
  'DISPATCHED',
  'DELIVERED',
  'SOLD',
  'EXPIRED'
] as const;

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: [
    'tenant:*', 'user:*', 'farm:*', 'crop:*', 'harvest:*', 'batch:*', 
    'inspection:*', 'warehouse:*', 'inventory:*', 'vehicle:*', 'driver:*', 
    'retailer:*', 'order:*', 'shipment:*', 'sensor:*', 'analytics:view', 'reports:*', 'finance:*'
  ],
  FARMER: ['farm:read', 'crop:*', 'harvest:*', 'batch:create', 'batch:read', 'inspection:read', 'order:read', 'payment:read'],
  FARM_MANAGER: ['farm:*', 'crop:*', 'harvest:*', 'batch:*', 'inspection:read'],
  QUALITY_INSPECTOR: ['batch:read', 'inspection:*', 'reports:quality'],
  TRANSPORT_MANAGER: ['vehicle:*', 'driver:*', 'shipment:*', 'geofence:*', 'tracking:view'],
  DRIVER: ['trip:view', 'trip:update', 'tracking:report', 'delivery:pod', 'offline:sync'],
  WAREHOUSE_MANAGER: ['warehouse:*', 'storage:*', 'inventory:*', 'receiving:*', 'dispatch:*', 'sensor:read'],
  RETAILER: ['produce:browse', 'order:create', 'order:read', 'shipment:track', 'invoice:read', 'delivery:confirm'],
  FINANCE_OFFICER: ['invoice:*', 'payment:*', 'expense:*', 'reports:financial']
};
