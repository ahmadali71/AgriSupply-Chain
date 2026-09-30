import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  tenantId?: string;
  subscriptions: Set<string>;
}

export class SocketServer {
  private static instance: SocketServer;
  private wss: WebSocketServer | null = null;
  private clients: Set<ExtendedWebSocket> = new Set();

  private constructor() {}

  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }
    return SocketServer.instance;
  }

  public init(server: HttpServer): WebSocketServer {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: ExtendedWebSocket, req) => {
      ws.isAlive = true;
      ws.subscriptions = new Set(['telemetry', 'alerts', 'orders', 'geofence']);

      // Extract tenant if sent via URL query param
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const tenantParam = url.searchParams.get('tenant_id');
      if (tenantParam) {
        ws.tenantId = tenantParam;
      }

      this.clients.add(ws);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'SUBSCRIBE' && data.channel) {
            ws.subscriptions.add(data.channel);
          } else if (data.type === 'SET_TENANT' && data.tenantId) {
            ws.tenantId = data.tenantId;
          } else if (data.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          }
        } catch (e) {
          // ignore malformed client packets
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // Send initial welcome
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'AgriSupply Real-Time IoT and Logistics Stream Connected',
        timestamp: Date.now()
      }));
    });

    // Heartbeat check every 30 seconds
    const interval = setInterval(() => {
      this.clients.forEach(ws => {
        if (!ws.isAlive) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    console.log('[WEBSOCKET] Real-Time stream server mounted on /ws');
    return this.wss;
  }

  public broadcast(channel: string, payload: any, tenantId?: string): void {
    const message = JSON.stringify({
      channel,
      payload,
      timestamp: Date.now()
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        // Multi-tenant isolation: only filter if tenant is specified and client has a specific different tenant
        if (tenantId && client.tenantId && client.tenantId !== 'all' && client.tenantId !== tenantId) {
          return;
        }
        if (client.subscriptions.has(channel) || client.subscriptions.has('*')) {
          client.send(message);
        }
      }
    });
  }

  public getConnectedCount(): number {
    return this.clients.size;
  }
}

export const socketServer = SocketServer.getInstance();
