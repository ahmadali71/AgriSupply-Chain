import React, { useEffect, useState } from 'react';
import {
  Sprout, Truck, Boxes, ShoppingCart, ShieldAlert,
  DollarSign, TrendingUp, ThermometerSnowflake, Activity,
  Clock, MapPin, ArrowRight
} from 'lucide-react';
import { KpiCard } from '../components/KpiCard';
import { LeafletMap, MapMarkerItem } from '../components/LeafletMap';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Shipment, TemperatureAlert } from '../types';

interface DashboardPageProps {
  onNavigate: (view: string) => void;
  onOpenInspection?: (batchId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { latestTelemetry, isConnected } = useSocket();
  const [data, setData] = useState<any | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    const [dashRes, vehRes, farmRes, whRes] = await Promise.all([
      api.get<any>('/api/analytics/dashboard'),
      api.get<any>('/api/logistics/vehicles'),
      api.get<any>('/api/farms'),
      api.get<any>('/api/warehouses')
    ]);

    if (dashRes.success) setData(dashRes.data);
    if (vehRes.success) setVehicles(vehRes.data || []);
    if (farmRes.success) setFarms(farmRes.data || []);
    if (whRes.success) setWarehouses(whRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update vehicle positions and temperatures in real-time
  useEffect(() => {
    if (!latestTelemetry) return;
    setVehicles(prev => prev.map(v => {
      if (v.id === latestTelemetry.vehicleId || (latestTelemetry.plateNumber && v.plate_number === latestTelemetry.plateNumber)) {
        return {
          ...v,
          current_lat: latestTelemetry.latitude ?? v.current_lat,
          current_lng: latestTelemetry.longitude ?? v.current_lng,
          current_speed_kmh: latestTelemetry.speedKmh ?? v.current_speed_kmh,
          current_temp_c: latestTelemetry.temperatureC ?? v.current_temp_c
        };
      }
      return v;
    }));
  }, [latestTelemetry]);

  // Prepare map markers with valid coordinates
  const markers: MapMarkerItem[] = [
    ...farms.slice(0, 8)
      .filter(f => typeof f.latitude === 'number' && typeof f.longitude === 'number' && !isNaN(f.latitude) && !isNaN(f.longitude))
      .map(f => ({
        id: f.id,
        lat: f.latitude,
        lng: f.longitude,
        title: f.name,
        subtitle: `${f.size_acres || 50} Acres • ${f.crop_types || 'Produce'}`,
        type: 'FARM' as const
      })),
    ...warehouses
      .filter(w => typeof w.latitude === 'number' && typeof w.longitude === 'number' && !isNaN(w.latitude) && !isNaN(w.longitude))
      .map(w => ({
        id: w.id,
        lat: w.latitude,
        lng: w.longitude,
        title: w.name,
        subtitle: `${w.code || 'HUB'} • Cold Rooms: ${w.total_cold_rooms || 2}`,
        type: 'WAREHOUSE' as const
      })),
    ...vehicles
      .map(v => {
        const isLiveUpdated = latestTelemetry && latestTelemetry.vehicleId === v.id;
        const rawLat = isLiveUpdated && typeof latestTelemetry.latitude === 'number' ? latestTelemetry.latitude : v.current_lat;
        const rawLng = isLiveUpdated && typeof latestTelemetry.longitude === 'number' ? latestTelemetry.longitude : v.current_lng;
        if (typeof rawLat !== 'number' || typeof rawLng !== 'number' || isNaN(rawLat) || isNaN(rawLng)) {
          return null;
        }
        return {
          id: v.id,
          lat: rawLat,
          lng: rawLng,
          title: `Reefer ${v.plate_number || v.id}`,
          subtitle: v.model || 'Reefer Truck',
          temperatureC: isLiveUpdated ? latestTelemetry.temperatureC : v.current_temp_c,
          speedKmh: isLiveUpdated ? latestTelemetry.speedKmh : v.current_speed_kmh,
          status: v.status || 'IN_TRANSIT',
          type: 'VEHICLE' as const
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
  ];

  if (isLoading || !data) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-agri-600 font-semibold text-sm">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading AgriSupply Enterprise Dashboard...</span>
        </div>
      </div>
    );
  }

  const kpis = data.kpis;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-agri-900/10 via-cold-900/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Supply Chain Command & Smart Cold-Chain Telemetry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-tenant monitoring across 20+ farms, 5 automated warehouses, active reefer fleets, and retail distribution.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onNavigate('live-tracking')}
            className="px-4 py-2 rounded-xl bg-cold-600 hover:bg-cold-700 text-white font-bold text-xs shadow-md shadow-cold-600/20 inline-flex items-center space-x-1.5 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Full Fleet Radar</span>
          </button>
          <button
            onClick={() => onNavigate('kanban')}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-md inline-flex items-center space-x-1.5 transition-colors"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Supply Kanban</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <KpiCard
          title="Farms Monitored"
          value={kpis.totalFarms}
          change="+3 new"
          isPositive={true}
          subtitle="USDA & GlobalG.A.P"
          icon={<Sprout className="w-4 h-4" />}
          tone="agri"
          onClick={() => onNavigate('farms')}
        />
        <KpiCard
          title="Active Reefers"
          value={kpis.activeVehicles}
          change="100% online"
          isPositive={true}
          subtitle="In-Transit Telemetry"
          icon={<Truck className="w-4 h-4" />}
          tone="cold"
          onClick={() => onNavigate('shipments')}
        />
        <KpiCard
          title="Inventory Stored"
          value={`${(kpis.currentInventoryKg / 1000).toFixed(1)} T`}
          change="FEFO Managed"
          isPositive={true}
          subtitle="5 Cold Hubs"
          icon={<Boxes className="w-4 h-4" />}
          tone="agri"
          onClick={() => onNavigate('inventory')}
        />
        <KpiCard
          title="Pending Orders"
          value={kpis.pendingOrders}
          change={`${kpis.deliveredOrders} delivered`}
          isPositive={true}
          subtitle="Retail Supermarkets"
          icon={<ShoppingCart className="w-4 h-4" />}
          tone="cold"
          onClick={() => onNavigate('kanban')}
        />
        <KpiCard
          title="Cold-Chain Alerts"
          value={kpis.openAlerts}
          change={kpis.criticalAlerts > 0 ? `${kpis.criticalAlerts} critical` : 'Nominal'}
          isPositive={kpis.criticalAlerts === 0}
          subtitle="Sub-Zero & Chilled"
          icon={<ShieldAlert className="w-4 h-4" />}
          tone={kpis.criticalAlerts > 0 ? 'rose' : 'amber'}
          onClick={() => onNavigate('alerts')}
        />
      </div>

      {/* Map & Telemetry Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live California Agricultural & Cold-Chain Transit Radar
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {vehicles.length} Trucks • {warehouses.length} Hubs • {farms.length} Farms
            </span>
          </div>

          <LeafletMap
            markers={markers}
            className="h-[420px]"
            zoom={7}
          />
        </div>

        {/* Cold-Chain Quality & Spoilage Breakdown (1 col) */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>Quality & Spoilage Metrics</span>
              <span className="text-xs font-bold text-agri-600 bg-agri-50 dark:bg-agri-950 px-2 py-0.5 rounded-full">
                {kpis.passRate}% Pass Rate
              </span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Inspection Approval Rate</span>
                  <span className="font-bold text-slate-900 dark:text-white">{kpis.passRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-agri-500 h-full rounded-full" style={{ width: `${kpis.passRate}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">On-Time Delivery Performance</span>
                  <span className="font-bold text-slate-900 dark:text-white">{kpis.onTimeDeliveryRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-cold-500 h-full rounded-full" style={{ width: `${kpis.onTimeDeliveryRate}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Cold-Chain Spoilage Loss</span>
                  <span className="font-bold text-emerald-600">{kpis.spoilageRate}% (Goal: &lt; 2%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpis.spoilageRate * 10}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Revenue Realized</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                ${kpis.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Net Profit: <strong className="text-emerald-600">${(kpis.totalRevenue - kpis.totalExpenses).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Active Cold Chain Alerts Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Cold-Chain Alerts</h3>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-xs text-agri-600 font-semibold hover:underline flex items-center space-x-0.5"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {data.recentAlerts?.length > 0 ? (
                data.recentAlerts.slice(0, 3).map((a: TemperatureAlert) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        a.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      }`}>
                        {a.severity}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(a.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium truncate">{a.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No active temperature alerts
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
