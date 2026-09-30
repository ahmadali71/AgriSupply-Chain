import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import { initDatabase } from './db/index.js';
import { socketServer } from './websocket/server.js';
import { iotSimulator } from './services/iotSimulator.js';

// Route Handlers
import authRouter from './routes/auth.js';
import tenantsRouter from './routes/tenants.js';
import usersRouter from './routes/users.js';
import farmsRouter from './routes/farms.js';
import cropsRouter from './routes/crops.js';
import batchesRouter from './routes/batches.js';
import inspectionsRouter from './routes/inspections.js';
import warehousesRouter from './routes/warehouses.js';
import inventoryRouter from './routes/inventory.js';
import ordersRouter from './routes/orders.js';
import logisticsRouter from './routes/logistics.js';
import trackingRouter from './routes/tracking.js';
import sensorsRouter from './routes/sensors.js';
import deliveriesRouter from './routes/deliveries.js';
import financeRouter from './routes/finance.js';
import analyticsRouter from './routes/analytics.js';
import reportsRouter from './routes/reports.js';
import syncRouter from './routes/sync.js';
import weatherRouter from './routes/weather.js';
import auditRouter from './routes/audit.js';
import healthRouter from './routes/health.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize SQLite Schema
initDatabase();

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/users', usersRouter);
app.use('/api/farms', farmsRouter);
app.use('/api/crops', cropsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/logistics', logisticsRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/sensors', sensorsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/finance', financeRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/health', healthRouter);
app.use('/health', healthRouter);

// Initialize WebSocket Engine
socketServer.init(server);

// Start IoT Simulation Engine
if (!process.env.VERCEL && process.env.ENABLE_IOT_SIMULATOR !== 'false') {
  const interval = parseInt(process.env.SIMULATION_INTERVAL_MS || '3000');
  iotSimulator.start(interval);
}

// Serve Web Client assets in production if built
const clientDistPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 AgriSupply Platform Backend Server listening on port ${PORT}`);
    console.log(`📡 WebSocket endpoint mounted on ws://localhost:${PORT}/ws`);
    console.log(`🏥 Health check ready at http://localhost:${PORT}/health`);
    console.log(`=======================================================`);
  });
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  iotSimulator.stop();
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
