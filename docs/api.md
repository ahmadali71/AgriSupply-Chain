# AgriSupply Platform API Reference Specification

## 1. Base URL & Protocol

- **REST API**: `http://localhost:5000/api`
- **WebSocket Gateway**: `ws://localhost:5000/ws`
- **Content Type**: `application/json; charset=utf-8`

---

## 2. Authentication & Authorization

All authenticated endpoints require an Authorization bearer header:
```http
Authorization: Bearer <access_token>
```
To query a specific tenant (for Super Admins or multi-tenant operators):
```http
x-tenant-id: <tenant_id>
```

### Response Envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Envelope:
```json
{
  "success": false,
  "error": "Error description message"
}
```

---

## 3. Endpoints Directory

### 3.1 Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate with email & password. Returns JWT access token, refresh token, and user profile.
- `POST /api/auth/demo-login`: Switch active user persona instantly for presentations (Super Admin, Farmer, Driver, Warehouse Manager, Retailer).
- `POST /api/auth/refresh`: Rotate refresh token to obtain a new access token.
- `POST /api/auth/logout`: Revoke active session tokens.

### 3.2 Tenant Management (`/api/tenants`)
- `GET /api/tenants`: List all provisioned organizations.
- `POST /api/tenants`: Create a new tenant with isolated operational parameters.
- `GET /api/tenants/:id`: Retrieve tenant configuration and subscription status.

### 3.3 User & RBAC Management (`/api/users`)
- `GET /api/users`: List users filtered by tenant, role, and active status.
- `POST /api/users`: Provision a new operator with assigned RBAC role.
- `PUT /api/users/:id`: Modify user permissions and profile.

### 3.4 Farm & Crop Operations (`/api/farms`, `/api/crops`)
- `GET /api/farms`: List all farms with GPS boundary coordinates, certification status, and acreage.
- `POST /api/farms`: Register a new farm with acreage, irrigation type, and soil classification.
- `GET /api/crops`: List crop varieties, lifecycle stages, planting dates, and estimated yields.
- `POST /api/crops/harvest`: Record harvest yields and automatically generate GS1-compliant batch lots.

### 3.5 Batches & Traceability (`/api/batches`)
- `GET /api/batches`: List all batches with storage conditions, temperature limits, and inspection status.
- `POST /api/batches`: Create a new batch lot manually or from harvest records.
- `GET /api/batches/trace/:batchId`: Retrieve the complete farm-to-fork visual traceability timeline.
- `GET /api/batches/:id/qr`: Generate QR code base64 payload for field crate labeling.

### 3.6 Dynamic Quality Inspections (`/api/inspections`)
- `GET /api/inspections`: List all completed and pending quality inspections.
- `POST /api/inspections`: Submit a 10-step inspection form (visual score, weight, moisture, temperature, contamination check, corrective actions).
- `GET /api/inspections/batch/:batchId`: Retrieve inspection certificate for a specific batch.

### 3.7 Warehouses & Inventory (`/api/warehouses`, `/api/inventory`)
- `GET /api/warehouses`: List distribution centers with total capacity, current occupancy, and cold-room status.
- `GET /api/warehouses/:id/zones`: List temperature-controlled zones, racks, and shelves.
- `GET /api/inventory`: Real-time stock levels with FEFO/FIFO expiry flags.
- `POST /api/inventory/receive`: Ingest approved batches into designated warehouse rack positions.
- `POST /api/inventory/transfer`: Transfer stock between storage locations.

### 3.8 Logistics, Fleet & Tracking (`/api/logistics`, `/api/tracking`)
- `GET /api/logistics/vehicles`: Refrigerated fleet inventory with active telemetry and fuel levels.
- `GET /api/logistics/drivers`: Certified driver directory with duty hours and assigned trips.
- `POST /api/logistics/shipments`: Create and dispatch a new temperature-controlled transport order.
- `GET /api/tracking/live`: Real-time GPS locations, route lines, speeds, and cargo temperatures.
- `GET /api/tracking/geofences`: Defined polygon and circular perimeters (Farms, Depots, Retail Bays).

### 3.9 IoT Sensors & Telemetry (`/api/sensors`)
- `GET /api/sensors`: List of IoT sensor hardware (DHT22, BLE Temp Beacons, GPS trackers).
- `GET /api/sensors/alerts`: Real-time cold-chain excursion alerts (CRITICAL, WARNING).
- `POST /api/sensors/simulate-spike`: Inject simulated heat excursions for compliance training and system demos.
- `POST /api/sensors/acknowledge/:id`: Acknowledge and resolve temperature alerts.

### 3.10 Orders & Kanban Pipeline (`/api/orders`)
- `GET /api/orders`: List retailer purchase orders with fulfillment status.
- `POST /api/orders`: Submit a new purchase order for quality-approved batches.
- `PUT /api/orders/:id/kanban`: Advance order across the 9-stage Kanban pipeline (`NEW` → `QUALITY CHECK` → `APPROVED` → `READY` → `IN TRANSIT` → `WAREHOUSE` → `PROCESSING` → `DISPATCHED` → `DELIVERED`).

### 3.11 Proof of Delivery & Deliveries (`/api/deliveries`)
- `GET /api/deliveries`: List completed deliveries with electronic receipts.
- `POST /api/deliveries`: Submit digital POD with receiver signature, base64 photo, GPS point, and delivered quantity.

### 3.12 Finance & Accounting (`/api/finance`)
- `GET /api/finance/invoices`: Commercial invoices with tax, freight, and cold-storage line items.
- `GET /api/finance/payments`: Payment transaction ledger with settlement status.
- `POST /api/finance/payments`: Record incoming payment against an invoice.
- `GET /api/finance/summary`: High-level financial KPIs (Revenue, Logistics Expenses, Net Margin).

### 3.13 Offline Synchronization (`/api/sync`)
- `POST /api/sync`: Ingest queued offline actions (PODs, field inspections, GPS pings) with conflict detection and idempotency guarantee.
- `GET /api/sync/history`: Audit log of synchronized transactions.

### 3.14 Weather Integration (`/api/weather`)
- `GET /api/weather/live`: Live weather telemetry and 7-day agricultural forecasts powered by Open-Meteo API.

### 3.15 PDF/CSV Compliance Reports (`/api/reports`)
- `GET /api/reports/inventory/pdf`: Download formatted inventory audit PDF.
- `GET /api/reports/shipments/csv`: Export shipment logistics CSV.
- `GET /api/reports/cold-chain/pdf`: Download cold-chain compliance report with temperature graph.

### 3.16 Audit Trail & System Health (`/api/audit`, `/api/health`)
- `GET /api/audit`: Tamper-evident chronological log of all create, update, delete, and auth events.
- `GET /api/health`: Real-time health status of API, Database, WebSocket hub, and IoT simulator.

---

## 4. WebSocket Gateway Protocol

Connect to `ws://localhost:5000/ws`

### Subscription Frame:
```json
{
  "type": "SUBSCRIBE",
  "channel": "tracking",
  "tenantId": "tenant-greenvalley"
}
```

### Incoming Telemetry Frame (`GPS_UPDATE`):
```json
{
  "event": "GPS_UPDATE",
  "vehicleId": "veh-01",
  "licensePlate": "CA-7K992",
  "latitude": 36.7783,
  "longitude": -119.4179,
  "speedKmh": 68.4,
  "temperatureC": 2.8,
  "humidity": 87.2,
  "timestamp": "2026-09-28T16:20:00.000Z"
}
```
