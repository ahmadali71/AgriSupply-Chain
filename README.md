# 🌱 AgriSupply Chain & Smart Cold-Chain Logistics Platform

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18.x-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8.svg)](https://tailwindcss.com)
[![Flutter](https://img.shields.io/badge/Flutter-v3.x-02569B.svg)](https://flutter.dev)
[![Tests](https://img.shields.io/badge/Acceptance%20Tests-39%2F39%20Passing-brightgreen.svg)]()

> A production-grade, enterprise-scale AgriSupply Chain & Smart Cold-Chain Logistics SaaS Platform orchestrating fresh agricultural produce from **Farm → Quality Inspection → Transport → Cold Storage → Warehouse → Retailer → Final Proof of Delivery**.

---

## 🌟 Key Capabilities & Enterprise Highlights

* **Complete End-to-End Workflow**: Unbroken supply chain linking farms, harvests, GS1-compliant batches, dynamic quality inspections, refrigerated transport orders, cold storage rack allocation, retailer orders, 9-stage Kanban pipeline, digital proof of delivery, automated invoicing, and farm-to-fork batch traceability.
* **Multi-Tenant SaaS Architecture**: True logical data isolation for tenants with tenant-aware middleware, tenant-scoped database queries across 32 relational tables, and tenant-namespaced WebSocket channels.
* **10 Specialized Enterprise Roles (RBAC)**: Super Admin, Tenant Admin, Farmer, Farm Manager, Quality Inspector, Transport Manager, Driver, Warehouse Manager, Retailer, and Finance Officer.
* **Real-Time IoT Cold-Chain Engine**: Continuous 3-second sensor telemetry streaming (Temperature, Humidity, Battery, Door open, GPS). Visual warnings, sound alerts, and automated quarantine triggered on cold-chain excursions (< 0°C or > 4°C).
* **Live GPS Fleet Tracking & Geofencing Radar**: Interactive Leaflet maps tracking refrigerated vehicles with speed, heading, route polylines, and automatic geofence boundary events (`ENTERED_ZONE`, `LEFT_ZONE`, `DELIVERY_ZONE_REACHED`).
* **Dynamic 10-Step Quality Inspection**: Conditional multi-attribute inspection forms evaluating visual rating, weight, moisture, temperature, packaging integrity, and contamination with electronic inspector signature and photo uploads.
* **Offline-First Driver & Field Operation**: Resilient mobile & PWA offline mode with local queueing. Automatic synchronization and conflict resolution upon network reconnection with zero data loss.
* **Interactive 9-Stage Kanban Supply Pipeline**: Drag-and-drop order fulfillment board with immediate state updates and real-time WebSocket synchronization across client terminals.
* **External API Integration**: Live weather conditions and 7-day agricultural forecasts powered by the Open-Meteo REST API.
* **Enterprise Reporting**: One-click generation of PDF audits (with jsPDF) and CSV data exports for inventory, logistics, and cold-chain compliance.

---

## 🏗️ System Architecture & Workflow

```
   ┌────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
   │  FARM & CROP   │ ───► │ DYNAMIC QUALITY CONTROL │ ───► │ REFRIGERATED TRANSPORT  │
   │  Harvest & Lot │      │ 10-Step Inspection Pass │      │ GPS & Sensor Streaming  │
   └────────────────┘      └─────────────────────────┘      └───────────┬─────────────┘
                                                                        │
   ┌────────────────┐      ┌─────────────────────────┐                  ▼
   │  RETAILER PO   │ ◄─── │ CENTRAL COLD WAREHOUSE  │ ◄────────────────┘
   │  Kanban Stages │      │ FEFO Rack & Shelf Slots │
   └───────┬────────┘      └─────────────────────────┘
           │
           ▼
   ┌────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
   │ OUTBOUND TRIP  │ ───► │ PROOF OF DELIVERY (POD) │ ───► │ INVOICE & SETTLEMENT    │
   │ Mobile Offline │      │ Signature & Photo Sync  │      │ Farm-to-Fork Trace View │
   └────────────────┘      └─────────────────────────┘      └─────────────────────────┘
```

---

## 💻 Tech Stack

### Web Frontend (`/web`)
* **Framework**: React 18 + Vite (Strict TypeScript)
* **Styling & UI**: Tailwind CSS, Lucide React Icons, Glassmorphic Dashboard
* **Maps & Telemetry**: Leaflet, React-Leaflet
* **State & Networking**: TanStack React Query, Native WebSocket Client, Audio Synthesis alerts

### Backend API & IoT Hub (`/backend`)
* **Runtime**: Node.js v20+ / v24 (TypeScript via `tsx`)
* **HTTP & WebSocket**: Express.js, `ws` RFC 6455 Engine
* **Database**: SQLite 3 with Write-Ahead Logging (`better-sqlite3`), 32 Normalized Tables, Foreign Keys, Performance Indexes
* **Security**: JWT Access Tokens, Refresh Token Rotation, BCrypt Password Hashing, Role-Based Access Control, Tamper-Evident Audit Logging
* **Document Engine**: jsPDF for dynamic compliance certificates

### Mobile Application (`/mobile`)
* **Framework**: Flutter 3 (Dart)
* **Architecture**: Riverpod State Management, Drift/SQLite Local Persistence, Resilient Sync Circuit Breaker
* **Hardware APIs**: Digital Canvas Signature Pad, Camera/Photo Capture, Background GPS

---

## ⚡ Quick Start & Installation

### Prerequisites
* Node.js v18+ (tested on Node v20 & v24)
* npm v9+

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repository_url>
cd agrisupply-platform

# Install root dependencies
npm install

# Install backend & web dependencies
npm --prefix backend install
npm --prefix web install
```

### 2. Seed the Database
Populates 3 enterprise tenants, 12 users across 10 roles, 20+ farms, crops, harvests, GS1 batches, warehouses, storage zones, refrigerated fleet vehicles, drivers, IoT sensors, historical temperature readings, purchase orders, deliveries, invoices, and audit logs:
```bash
npm run seed
```

### 3. Launch the Development Environment
Run backend and frontend concurrently:
```bash
# Start Backend API & IoT Telemetry Simulator (Port 5000)
npm run dev:backend

# In a separate terminal, start Web Application (Port 3000)
npm run dev:web
```

* **Web Application**: Open [http://localhost:3000](http://localhost:3000)
* **REST API**: Open [http://localhost:5000/api](http://localhost:5000/api)
* **Health Check**: Open [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Testing & Verification

### Unit Tests
Verifies Geofence Haversine calculations, Batch GS1 formatting, and Cold-Chain excursion state machines:
```bash
npm test
```

### 39-Step End-to-End Acceptance Test
Executes the comprehensive business workflow specified in the production brief:
```bash
npm run test:e2e
```
**Acceptance Test Output:**
```text
========================================================================
🧪 AGRISUPPLY PLATFORM: 39-STEP ACCEPTANCE VERIFICATION RUNNER
========================================================================
✅ Step 1: Admin successfully authenticated with JWT
✅ Step 2: Multi-tenant isolation verified with 3+ tenants
✅ Step 3: Registered farmer directory retrieved
✅ Step 4: Farm successfully created with GPS coordinates
✅ Step 5: Crop lifecycle established
✅ Step 6: Harvest yield recorded
✅ Step 7: Unique batch created with GS1 QR metadata
✅ Step 8 & 9: Dynamic inspection passed and batch marked APPROVED
✅ Step 10-12: Refrigerated fleet vehicles and drivers retrieved
✅ Step 13: Shipment dispatched in IN_TRANSIT status
✅ Step 14-16: Live GPS telemetry and cargo temperature streaming
✅ Step 17 & 18: Geofence perimeter active and monitored
✅ Step 19-21: Temperature excursion alert generated and dispatched via WebSocket
✅ Step 22-26: Offline POD reconnected and synchronized with 0 conflicts
✅ Step 27 & 28: Warehouse received batch and allocated FEFO storage slot
✅ Step 29: Retailer order created
✅ Step 30: Order advanced across Kanban stages
✅ Step 31-33: Proof of delivery verified with signature records
✅ Step 34: Commercial invoice automatically issued
✅ Step 35: Financial settlement payment recorded in accounting ledger
✅ Step 36: Complete end-to-end traceability timeline verified from farm to fork
✅ Step 37: Analytics deck updated in real time
✅ Step 38: Multi-domain compliance reports generated
✅ Step 39: Immutable tamper-evident audit trail verified
========================================================================
🎉 ALL 39 ACCEPTANCE TEST CRITERIA PASSED WITHOUT ERROR!
========================================================================
```

---

## 🎮 Interactive Demo Mode Guide

The top navigation bar provides immediate controls for presentations and evaluator review:

1. **Instant Persona Switcher**: Switch between Super Admin, Farmer, Quality Inspector, Driver, Warehouse Manager, and Retailer with one click.
2. **Multi-Tenant Selector**: Instantly switch view between *GreenValley Organics*, *SunHarvest Logistics*, and *Nordic Dairy Fresh*.
3. **Offline Simulation Toggle**: Flip the **Offline Mode** toggle to disconnect networking. Submit inspections or complete deliveries locally; toggle back online to watch the **Sync Queue** automatically reconcile data with the backend.
4. **Cold-Chain Heat Spike Injector**: On the **Cold Chain** page, click **"Simulate Temp Spike (+11.2°C)"** to trigger an instantaneous critical excursion alert, sound notification, and map radar flashing.

---

## 📁 Repository Directory Structure

```text
.
├── backend/
│   ├── data/                   # SQLite database directory
│   ├── scripts/
│   │   ├── test-e2e.js         # 39-step end-to-end acceptance test suite
│   │   └── test-unit.js        # Unit test suite
│   ├── src/
│   │   ├── db/                 # Schema (32 tables) & seed data generator
│   │   ├── middleware/         # Auth, Tenant isolation, Audit logging
│   │   ├── routes/             # 21 REST controllers
│   │   ├── services/           # IoT simulator, Geofence engine, Trace, Sync, PDF
│   │   ├── websocket/          # WebSocket multi-tenant hub
│   │   └── server.ts           # Express HTTP & WS server entrypoint
│   └── package.json
│
├── web/
│   ├── src/
│   │   ├── components/         # LeafletMap, DataTable, KpiCard, Kanban, Modals
│   │   ├── pages/              # 12 Enterprise pages (Farms, ColdChain, Kanban, Traceability...)
│   │   ├── App.tsx             # Root router & role layout
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
│
├── mobile/
│   ├── lib/
│   │   ├── core/               # ApiClient, OfflineStorage, SocketClient
│   │   ├── features/           # DriverTrips, ProofOfDelivery with Signature Canvas
│   │   └── main.dart           # Flutter 3 application entrypoint
│   └── pubspec.yaml
│
├── docs/
│   ├── architecture.md         # Detailed architectural documentation & sequence flows
│   ├── api.md                  # Complete REST API reference specification
│   ├── database.md             # 32-table database schema, indexes & ERD
│   └── deployment.md           # Docker, Compose & Cloud production deployment guide
│
├── .env.example                # Environment variable configuration template
├── README.md                   # System documentation
└── package.json                # Root orchestration package
```

---

## 🔒 Security & Data Integrity

* **Zero Plaintext Passwords**: Industry-standard BCrypt hashing with salt rounds.
* **Token Rotation**: Short-lived JWT access tokens paired with rotating refresh tokens.
* **Tenant Isolation**: Rigid validation preventing cross-organization leakage across HTTP and WebSockets.
* **Immutable Audit Trail**: Append-only transaction logging capturing `ip_address`, `device_info`, `user_id`, `module`, and state diffs.
* **Idempotent Synchronization**: Deduplicated client sync IDs prevent duplicate ledger entries during unstable wireless reconnections.

---

## 📄 License
This project is licensed under the MIT License.
