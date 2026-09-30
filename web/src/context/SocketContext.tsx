import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

export interface TelemetryPacket {
  vehicleId?: string;
  plateNumber?: string;
  shipmentId?: string;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  temperatureC?: number;
  batteryPct?: number;
  sensorId?: string;
  warehouseName?: string;
  timestamp: string;
}

export interface AlertPacket {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  alertType: string;
  message: string;
  readingValue?: number;
  thresholdValue?: number;
  sensorId?: string;
  shipmentId?: string;
  timestamp: string;
}

export interface GeofenceEventPacket {
  id?: string;
  geofenceId?: string;
  fenceName?: string;
  vehicleId?: string;
  plate_number?: string;
  geofence_name?: string;
  shipmentId?: string;
  eventType?: string;
  event_type?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

interface SocketContextType {
  isConnected: boolean;
  latestTelemetry: TelemetryPacket | null;
  latestGeofenceEvent: GeofenceEventPacket | null;
  liveAlerts: AlertPacket[];
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTenantId } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryPacket | null>(null);
  const [latestGeofenceEvent, setLatestGeofenceEvent] = useState<GeofenceEventPacket | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<AlertPacket[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: any;

    let pingInterval: any;

    function connect() {
      let url: string;
      const customWsUrl = (import.meta as any).env?.VITE_WS_URL;
      if (customWsUrl) {
        url = customWsUrl.includes('?') 
          ? `${customWsUrl}&tenant_id=${activeTenantId}` 
          : `${customWsUrl}?tenant_id=${activeTenantId}`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname || 'localhost';
        // In development (ports 3000, 5173, etc.), the backend is on port 5000.
        const isDevPort = ['3000', '5173', '4173'].includes(window.location.port);
        const wsPort = isDevPort ? '5000' : (window.location.port || (protocol === 'wss:' ? '443' : '80'));
        const wsHost = `${hostname}:${wsPort}`;
        url = `${protocol}//${wsHost}/ws?tenant_id=${activeTenantId}`;
      }

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log(`[WEBSOCKET CLIENT] Connected to AgriSupply real-time stream at ${url}`);
          // Send keepalive ping every 15s
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 15000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.channel === 'telemetry') {
              setLatestTelemetry(data.payload);
            } else if (data.channel === 'alerts') {
              setLiveAlerts(prev => [data.payload, ...prev.slice(0, 19)]);
            } else if (data.channel === 'geofence') {
              setLatestGeofenceEvent(data.payload);
              // Also treat geofence arrival as alert
              setLiveAlerts(prev => [{
                id: data.payload.id || `geo-${Date.now()}`,
                severity: 'INFO',
                alertType: data.payload.eventType || 'GEOFENCE',
                message: `Geofence: ${data.payload.fenceName || 'Facility'} - ${data.payload.eventType}`,
                timestamp: data.payload.timestamp || new Date().toISOString()
              }, ...prev.slice(0, 19)]);
            }
          } catch (e) {
            // ignore parsing error
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          clearInterval(pingInterval);
          reconnectTimeout = setTimeout(connect, 2000);
        };

        ws.onerror = (err) => {
          console.warn('[WEBSOCKET CLIENT] Connection error, will retry...', err);
          ws.close();
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [activeTenantId]);

  const dismissAlert = (id: string) => {
    setLiveAlerts(prev => prev.filter(a => a.id !== id));
  };

  const clearAllAlerts = () => {
    setLiveAlerts([]);
  };

  return (
    <SocketContext.Provider value={{
      isConnected,
      latestTelemetry,
      latestGeofenceEvent,
      liveAlerts,
      dismissAlert,
      clearAllAlerts
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
