import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { socketServer } from '../websocket/server.js';
import { iotSimulator } from '../services/iotSimulator.js';

const router = Router();
const startTime = Date.now();

// GET /health and /api/health
router.get('/', (req: Request, res: Response): void => {
  try {
    const dbTest = db.prepare('SELECT 1 as alive').get() as any;
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const memory = process.memoryUsage();

    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: uptimeSec,
      services: {
        api: { status: 'HEALTHY', version: '1.0.0' },
        database: { status: dbTest?.alive === 1 ? 'HEALTHY' : 'DEGRADED', engine: 'SQLite (WAL Mode)' },
        websocket: { status: 'HEALTHY', connectedClients: socketServer.getConnectedCount() },
        iotSimulator: iotSimulator.getStatus()
      },
      system: {
        nodeVersion: process.version,
        rssMemoryMb: +(memory.rss / (1024 * 1024)).toFixed(1),
        heapUsedMb: +(memory.heapUsed / (1024 * 1024)).toFixed(1)
      }
    });
  } catch (err: any) {
    res.status(503).json({ status: 'DOWN', error: err.message });
  }
});

// GET /api/health/database
router.get('/database', (req: Request, res: Response): void => {
  try {
    const tableCounts: Record<string, number> = {};
    const tables = ['tenants', 'users', 'farms', 'crops', 'batches', 'quality_inspections', 'warehouses', 'inventory', 'vehicles', 'orders', 'shipments', 'sensors', 'temperature_alerts'];

    for (const t of tables) {
      const row = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get() as any;
      tableCounts[t] = row.c;
    }

    res.json({
      status: 'HEALTHY',
      databaseEngine: 'SQLite WAL Mode',
      tableRecordCounts: tableCounts
    });
  } catch (err: any) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// GET /api/health/websocket
router.get('/websocket', (req: Request, res: Response): void => {
  res.json({
    status: 'ONLINE',
    endpoint: '/ws',
    connectedClients: socketServer.getConnectedCount()
  });
});

export default router;
