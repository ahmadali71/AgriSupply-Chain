import React, { useState, useEffect } from 'react';
import { Radio, Thermometer, ShieldAlert, CheckCircle2, AlertTriangle, Battery, RefreshCw, Flame } from 'lucide-react';
import { Sensor, TemperatureAlert } from '../types';
import { api } from '../services/api';
import { DataTable, Column } from '../components/DataTable';
import { useSocket } from '../context/SocketContext';

interface ColdChainPageProps {
  initialTab?: 'sensors' | 'alerts';
}

export const ColdChainPage: React.FC<ColdChainPageProps> = ({ initialTab = 'sensors' }) => {
  const [tab, setTab] = useState<'sensors' | 'alerts'>(initialTab);
  const { latestTelemetry } = useSocket();

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<TemperatureAlert[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchColdChainData = async () => {
    setIsLoading(true);
    const [snsRes, altRes] = await Promise.all([
      api.get<Sensor[]>('/api/sensors'),
      api.get<TemperatureAlert[]>('/api/sensors/alerts/all')
    ]);

    if (snsRes.success && snsRes.data) {
      setSensors(snsRes.data);
      if (snsRes.data.length > 0 && !selectedSensor) {
        loadReadings(snsRes.data[0]);
      }
    }
    if (altRes.success && altRes.data) setAlerts(altRes.data);
    setIsLoading(false);
  };

  const loadReadings = async (sensor: Sensor) => {
    setSelectedSensor(sensor);
    const res = await api.get<any[]>(`/api/sensors/${sensor.id}/readings?limit=25`);
    if (res.success && res.data) {
      setReadings(res.data);
    }
  };

  useEffect(() => {
    fetchColdChainData();
  }, []);

  // Update live readings and sensor values dynamically when WebSocket packet arrives
  useEffect(() => {
    if (!latestTelemetry) return;

    setSensors(prev => prev.map(s => {
      const matchVehicle = latestTelemetry.plateNumber && s.attached_name?.includes(latestTelemetry.plateNumber);
      const matchSensorId = latestTelemetry.sensorId && s.id === latestTelemetry.sensorId;
      if (matchVehicle || matchSensorId) {
        return {
          ...s,
          current_value: latestTelemetry.temperatureC ?? s.current_value,
          last_heartbeat: latestTelemetry.timestamp
        };
      }
      return s;
    }));

    if (selectedSensor) {
      const isSelectedVehicle = latestTelemetry.plateNumber && selectedSensor.attached_name?.includes(latestTelemetry.plateNumber);
      const isSelectedSensor = latestTelemetry.sensorId && selectedSensor.id === latestTelemetry.sensorId;
      if ((isSelectedVehicle || isSelectedSensor) && latestTelemetry.temperatureC !== undefined) {
        setReadings(prev => [
          {
            id: `live-${Date.now()}`,
            value: latestTelemetry.temperatureC,
            reading_type: 'TEMPERATURE',
            timestamp: latestTelemetry.timestamp
          },
          ...prev.slice(0, 24)
        ]);
      }
    }
  }, [latestTelemetry]);

  const handleResolveAlert = async (id: string) => {
    const notes = prompt('Enter resolution corrective notes:', 'Reefer setpoint calibrated. Thermal probe nominal.');
    if (!notes) return;
    const res = await api.put(`/api/sensors/alerts/${id}/resolve`, { resolution_notes: notes });
    if (res.success) {
      fetchColdChainData();
    }
  };

  const sensorColumns: Column<Sensor>[] = [
    {
      key: 'sensor_code',
      header: 'Sensor Code',
      render: (s) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-cold-500" />
            <span>{s.sensor_code}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">{s.attached_name || s.attached_type}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Sensor Type',
      render: (s) => <span className="font-semibold text-xs">{s.sensor_type}</span>
    },
    {
      key: 'current_value',
      header: 'Live Value',
      render: (s) => (
        <span className={`font-mono font-bold text-sm ${s.current_value > s.max_threshold ? 'text-rose-500 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
          {s.current_value}°C
        </span>
      )
    },
    {
      key: 'thresholds',
      header: 'Limits',
      render: (s) => <span className="text-xs text-slate-500">{s.min_threshold}°C – {s.max_threshold}°C</span>
    },
    {
      key: 'battery_pct',
      header: 'Battery',
      render: (s) => (
        <div className="flex items-center space-x-1 text-xs">
          <Battery className="w-3.5 h-3.5 text-emerald-500" />
          <span>{s.battery_pct}%</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Health',
      render: (s) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          s.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
          s.status === 'WARNING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
        }`}>
          {s.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Smart Cold-Chain IoT Monitoring</h2>
          <p className="text-xs text-slate-500">Real-time WebSocket telemetry, thermal threshold excursion detection, and automated corrective workflows.</p>
        </div>
        <button
          onClick={fetchColdChainData}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center space-x-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Real-time Telemetry Visualizer Chart */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Temperature Telemetry</div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {selectedSensor ? `${selectedSensor.sensor_code} (${selectedSensor.attached_name || 'Reefer Unit'})` : 'Select Sensor'}
            </h3>
          </div>
          {selectedSensor && (
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1 text-cold-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-cold-500"></span>
                <span>Reading (°C)</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-500 font-semibold">
                <span className="w-2.5 h-0.5 bg-rose-500"></span>
                <span>Max Limit: {selectedSensor.max_threshold}°C</span>
              </span>
            </div>
          )}
        </div>

        {/* SVG Telemetry Chart */}
        <div className="w-full h-48 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-end">
          {readings.length > 0 ? (
            <div className="h-full flex items-end justify-between space-x-2 pt-6">
              {readings.map((r, i) => {
                const heightPct = Math.min(100, Math.max(10, ((r.value + 5) / 20) * 100));
                const isOverLimit = selectedSensor && r.value > selectedSensor.max_threshold;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono pointer-events-none z-20 whitespace-nowrap">
                      {r.value}°C ({new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </div>
                    <div
                      className={`w-full max-w-[24px] rounded-t-lg transition-all ${
                        isOverLimit ? 'bg-rose-500 animate-pulse' : 'bg-cold-500 group-hover:bg-cold-600'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-slate-400 mt-1 font-mono truncate w-full text-center">
                      {new Date(r.timestamp).getHours()}:00
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Select a sensor to render telemetry logs.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sensors Table (2 cols) */}
        <div className="lg:col-span-2">
          <DataTable
            columns={sensorColumns}
            data={sensors}
            title="IoT Sensor Hardware Inventory"
            onRowClick={(s) => loadReadings(s)}
          />
        </div>

        {/* Cold-Chain Alerts List (1 col) */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Cold-Chain Alarms</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">{alerts.length} Total</span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {alerts.length > 0 ? (
              alerts.map(a => (
                <div
                  key={a.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                    a.status === 'OPEN'
                      ? a.severity === 'CRITICAL'
                        ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                        : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                      a.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      {a.severity}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-800 dark:text-slate-200">{a.message}</p>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[10px] font-bold ${a.status === 'RESOLVED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      Status: {a.status}
                    </span>
                    {a.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolveAlert(a.id)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-2xs"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No active cold chain excursions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
