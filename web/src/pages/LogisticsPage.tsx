import React, { useState, useEffect } from 'react';
import {
  Truck, MapPin, Plus, Navigation, Battery, Fuel,
  Thermometer, ShieldAlert, Send, Shield, AlertTriangle,
  Clock, CheckCircle2, Radio, Compass, RefreshCw
} from 'lucide-react';
import { Vehicle, Shipment, Batch, Geofence } from '../types';
import { api } from '../services/api';
import { LeafletMap, MapMarkerItem } from '../components/LeafletMap';
import { DataTable, Column } from '../components/DataTable';
import { useSocket } from '../context/SocketContext';

export interface LogisticsPageProps {
  initialTab?: 'live-tracking' | 'shipments' | 'vehicles' | 'routes' | 'geofences';
}

interface TransitRoute {
  id: string;
  name: string;
  highway: string;
  origin: string;
  destination: string;
  distance_km: number;
  est_duration_hours: number;
  target_temp_c: string;
  speed_limit_kmh: number;
  road_condition: 'OPTIMAL' | 'MODERATE' | 'CAUTION';
  active_transits: number;
}

export const LogisticsPage: React.FC<LogisticsPageProps> = ({ initialTab = 'live-tracking' }) => {
  const { latestTelemetry, latestGeofenceEvent } = useSocket();
  const [activeTab, setActiveTab] = useState<'live-tracking' | 'shipments' | 'vehicles' | 'routes' | 'geofences'>(initialTab);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [geofenceEvents, setGeofenceEvents] = useState<any[]>([]);

  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Shipment form
  const [batchId, setBatchId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [originName, setOriginName] = useState('Valley Green Farm (Salinas)');
  const [destName, setDestName] = useState('Central Cold Hub Alpha (Oakland)');
  const [distanceKm, setDistanceKm] = useState(140);

  // New Vehicle form
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('Freightliner eCascadia Reefer');
  const [newCapacity, setNewCapacity] = useState(12000);
  const [newMinTemp, setNewMinTemp] = useState(1.0);
  const [newMaxTemp, setNewMaxTemp] = useState(6.0);

  // New Geofence form
  const [fenceName, setFenceName] = useState('');
  const [fenceZoneType, setFenceZoneType] = useState('WAREHOUSE');
  const [fenceLat, setFenceLat] = useState(37.8044);
  const [fenceLng, setFenceLng] = useState(-122.2712);
  const [fenceRadius, setFenceRadius] = useState(600);

  // Static transit corridors
  const [transitRoutes] = useState<TransitRoute[]>([
    {
      id: 'route-salinas-oakland',
      name: 'Salinas Valley → Oakland Cold Hub Express',
      highway: 'US-101 N to I-880 N',
      origin: 'Valley Green Farm, Salinas (36.6777, -121.6555)',
      destination: 'Central Cold Hub Alpha, Oakland (37.8044, -122.2712)',
      distance_km: 154,
      est_duration_hours: 2.1,
      target_temp_c: '+2.0°C to +4.5°C',
      speed_limit_kmh: 90,
      road_condition: 'OPTIMAL',
      active_transits: 2
    },
    {
      id: 'route-fresno-oakland',
      name: 'Central Valley Central → Bay Area Reefer Line',
      highway: 'CA-99 N to I-580 W',
      origin: 'Golden State Orchards, Fresno (36.7468, -119.7726)',
      destination: 'Central Cold Hub Alpha, Oakland (37.8044, -122.2712)',
      distance_km: 272,
      est_duration_hours: 3.4,
      target_temp_c: '+1.5°C to +5.0°C',
      speed_limit_kmh: 88,
      road_condition: 'OPTIMAL',
      active_transits: 1
    },
    {
      id: 'route-salinas-sf',
      name: 'Coastal Organic Line → San Francisco Wholesale',
      highway: 'US-101 N to I-280 N',
      origin: 'Valley Green Farm, Salinas (36.6777, -121.6555)',
      destination: 'San Francisco Produce Market (37.7501, -122.3892)',
      distance_km: 168,
      est_duration_hours: 2.3,
      target_temp_c: '+2.0°C to +4.0°C',
      speed_limit_kmh: 85,
      road_condition: 'MODERATE',
      active_transits: 1
    },
    {
      id: 'route-bakersfield-sj',
      name: 'San Joaquin Deep South → Silicon Valley Hub',
      highway: 'I-5 N to CA-152 W',
      origin: 'Kern County AgriFields, Bakersfield (35.3733, -119.0187)',
      destination: 'Silicon Valley Distribution Center, San Jose (37.3382, -121.8863)',
      distance_km: 375,
      est_duration_hours: 4.5,
      target_temp_c: '+0.5°C to +3.5°C',
      speed_limit_kmh: 90,
      road_condition: 'OPTIMAL',
      active_transits: 0
    }
  ]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchLogistics = async () => {
    setIsLoading(true);
    const [vehRes, shpRes, batRes, drvRes, geoRes, evtRes] = await Promise.all([
      api.get<Vehicle[]>('/api/logistics/vehicles'),
      api.get<Shipment[]>('/api/logistics/shipments'),
      api.get<Batch[]>('/api/batches'),
      api.get<any[]>('/api/logistics/drivers'),
      api.get<Geofence[]>('/api/tracking/geofences'),
      api.get<any[]>('/api/tracking/geofences/events')
    ]);

    if (vehRes.success && vehRes.data) setVehicles(vehRes.data);
    if (shpRes.success && shpRes.data) setShipments(shpRes.data);
    if (batRes.success && batRes.data) {
      setBatches(batRes.data);
      if (batRes.data.length > 0 && !batchId) setBatchId(batRes.data[0].id);
    }
    if (drvRes.success && drvRes.data) {
      setDrivers(drvRes.data);
      if (drvRes.data.length > 0 && !driverId) setDriverId(drvRes.data[0].id);
    }
    if (geoRes.success && geoRes.data) setGeofences(geoRes.data);
    if (evtRes.success && evtRes.data) setGeofenceEvents(evtRes.data);
    if (vehRes.data && vehRes.data.length > 0 && !vehicleId) setVehicleId(vehRes.data[0].id);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogistics();
  }, []);

  // Update vehicle fleet coordinates and telemetry live
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

  // Prepend live geofence event
  useEffect(() => {
    if (!latestGeofenceEvent) return;
    setGeofenceEvents(prev => [latestGeofenceEvent, ...prev.slice(0, 49)]);
  }, [latestGeofenceEvent]);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/logistics/shipments', {
      batch_id: batchId,
      vehicle_id: vehicleId,
      driver_id: driverId,
      origin_type: 'FARM',
      origin_name: originName,
      origin_lat: 36.6777,
      origin_lng: -121.6555,
      destination_type: 'WAREHOUSE',
      destination_name: destName,
      destination_lat: 37.8044,
      destination_lng: -122.2712,
      distance_km: distanceKm
    });

    if (res.success) {
      setIsShipmentModalOpen(false);
      fetchLogistics();
    } else {
      alert(res.error || 'Failed to dispatch shipment');
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/logistics/vehicles', {
      plate_number: newPlate,
      model: newModel,
      capacity_kg: newCapacity,
      is_refrigerated: 1,
      min_temp_c: newMinTemp,
      max_temp_c: newMaxTemp
    });

    if (res.success) {
      setIsVehicleModalOpen(false);
      setNewPlate('');
      fetchLogistics();
    } else {
      alert(res.error || 'Failed to register fleet vehicle');
    }
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/tracking/geofences', {
      name: fenceName,
      zone_type: fenceZoneType,
      latitude: fenceLat,
      longitude: fenceLng,
      radius_meters: fenceRadius
    });

    if (res.success) {
      setIsGeofenceModalOpen(false);
      setFenceName('');
      fetchLogistics();
    } else {
      alert(res.error || 'Failed to create geofence perimeter');
    }
  };

  const mapMarkers: MapMarkerItem[] = [
    // Live vehicle markers
    ...vehicles.map(v => {
      const isLive = latestTelemetry && latestTelemetry.vehicleId === v.id;
      return {
        id: v.id,
        lat: isLive ? latestTelemetry.latitude! : v.current_lat,
        lng: isLive ? latestTelemetry.longitude! : v.current_lng,
        title: `Truck ${v.plate_number}`,
        subtitle: `${v.model} • Driver: ${v.driver_name || 'Assigned'}`,
        temperatureC: isLive ? latestTelemetry.temperatureC : v.current_temp_c,
        speedKmh: isLive ? latestTelemetry.speedKmh : v.current_speed_kmh,
        status: v.status,
        type: 'VEHICLE' as const
      };
    }),
    // Facility / Geofence markers
    ...geofences.map(g => ({
      id: g.id,
      lat: g.latitude,
      lng: g.longitude,
      title: g.name,
      subtitle: `Zone: ${g.zone_type} • Radius: ${g.radius_meters}m`,
      status: 'ONLINE',
      type: g.zone_type === 'FARM' ? ('FARM' as const) : ('WAREHOUSE' as const)
    }))
  ];

  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'shipment_number',
      header: 'Shipment Number',
      render: (s) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Truck className="w-3.5 h-3.5 text-cold-600" />
            <span>{s.shipment_number}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">{s.product_name} • {s.batch_number}</div>
        </div>
      )
    },
    {
      key: 'route',
      header: 'Transit Route',
      render: (s) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{s.origin_name} → {s.destination_name}</div>
          <div className="text-[11px] text-slate-400">{s.distance_km} km</div>
        </div>
      )
    },
    {
      key: 'vehicle',
      header: 'Assigned Fleet',
      render: (s) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{s.plate_number}</div>
          <div className="text-[11px] text-slate-400">{s.driver_name}</div>
        </div>
      )
    },
    {
      key: 'temperature',
      header: 'Cold-Chain Telemetry',
      render: (s) => {
        const isExcursion = s.temperature_status === 'WARNING' || s.temperature_status === 'CRITICAL';
        return (
          <div className="flex items-center space-x-1.5">
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
              isExcursion ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-cold-100 text-cold-800 dark:bg-cold-950 dark:text-cold-300'
            }`}>
              {s.current_temp_c ?? 4.2}°C
            </span>
            <span className="text-[10px] text-slate-400">({s.required_min_temp_c}–{s.required_max_temp_c}°C)</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Trip Status',
      render: (s) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          s.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse' :
          s.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
          'bg-slate-100 text-slate-700'
        }`}>
          {s.status}
        </span>
      )
    }
  ];

  const vehicleColumns: Column<Vehicle>[] = [
    {
      key: 'plate_number',
      header: 'License Plate & Model',
      render: (v) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Truck className="w-3.5 h-3.5 text-cold-600" />
            <span>{v.plate_number}</span>
          </div>
          <div className="text-[11px] text-slate-400">{v.model}</div>
        </div>
      )
    },
    {
      key: 'capacity_kg',
      header: 'Payload Capacity',
      render: (v) => {
        const cap = v.capacity_kg ?? 0;
        return (
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {(cap / 1000).toFixed(1)} MT ({cap.toLocaleString()} KG)
          </span>
        );
      }
    },
    {
      key: 'temperature',
      header: 'Live Temp & Bounds',
      render: (v) => {
        const cur = v.current_temp_c ?? 4.0;
        const min = v.min_temp_c ?? 2.0;
        const max = v.max_temp_c ?? 6.0;
        const isSpike = cur > max || cur < min;
        return (
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
              isSpike ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-cold-100 text-cold-800 dark:bg-cold-950 dark:text-cold-300'
            }`}>
              {cur}°C
            </span>
            <span className="text-[11px] text-slate-400">Target: {min}–{max}°C</span>
          </div>
        );
      }
    },
    {
      key: 'energy',
      header: 'Fuel & Battery',
      render: (v) => (
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <Fuel className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{v.fuel_pct}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Battery className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{v.battery_pct}%</span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Fleet Status',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          v.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse' :
          v.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {v.status}
        </span>
      )
    }
  ];

  const routeColumns: Column<TransitRoute>[] = [
    {
      key: 'name',
      header: 'Corridor & Highway',
      render: (r) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-cold-600" />
            <span>{r.name}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">{r.highway}</div>
        </div>
      )
    },
    {
      key: 'endpoints',
      header: 'Origin → Destination',
      render: (r) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800 dark:text-slate-200">{r.origin}</div>
          <div className="text-slate-400">↳ {r.destination}</div>
        </div>
      )
    },
    {
      key: 'distance_km',
      header: 'Distance & Duration',
      render: (r) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-xs">{r.distance_km} km</div>
          <div className="text-[11px] text-slate-400">~{r.est_duration_hours} hrs</div>
        </div>
      )
    },
    {
      key: 'target_temp_c',
      header: 'Cold-Chain Setpoint',
      render: (r) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cold-100 text-cold-800 dark:bg-cold-950 dark:text-cold-300">
          {r.target_temp_c}
        </span>
      )
    },
    {
      key: 'road_condition',
      header: 'Highway Status',
      render: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          r.road_condition === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
        }`}>
          {r.road_condition}
        </span>
      )
    }
  ];

  const geofenceColumns: Column<Geofence>[] = [
    {
      key: 'name',
      header: 'Geofence Name',
      render: (g) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-cold-600" />
            <span>{g.name}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">Radius: {g.radius_meters}m</div>
        </div>
      )
    },
    {
      key: 'zone_type',
      header: 'Zone Category',
      render: (g) => (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {g.zone_type}
        </span>
      )
    },
    {
      key: 'coordinates',
      header: 'Center Coordinates',
      render: (g) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
          {g.latitude.toFixed(4)}, {g.longitude.toFixed(4)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Protection Status',
      render: () => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center w-fit space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>ACTIVE SHIELD</span>
        </span>
      )
    }
  ];

  const geofenceEventColumns: Column<any>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      render: (e) => (
        <span className="font-mono text-[11px] text-slate-500">
          {new Date(e.timestamp).toLocaleTimeString()}
        </span>
      )
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (e) => (
        <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
          {e.plate_number || e.vehicleId || 'CA-REEFER-01'}
        </span>
      )
    },
    {
      key: 'event_type',
      header: 'Geofence Event',
      render: (e) => {
        const isEntered = e.event_type?.includes('ENTERED') || e.event_type?.includes('REACHED');
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isEntered ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
          }`}>
            {e.event_type?.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      key: 'geofence',
      header: 'Zone Perimeter',
      render: (e) => (
        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
          {e.geofence_name || e.fenceName || 'Central Cold Hub Oakland'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Logistics, Fleet & Highway Corridors</h2>
          <p className="text-xs text-slate-500">Real-time GPS breadcrumbs, continuous refrigerated trailer telemetry, and dynamic geofencing.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'shipments' && (
            <button
              onClick={() => setIsShipmentModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cold-600 hover:bg-cold-700 text-white font-bold text-xs shadow-md shadow-cold-600/20 inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch New Shipment</span>
            </button>
          )}

          {activeTab === 'vehicles' && (
            <button
              onClick={() => setIsVehicleModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cold-600 hover:bg-cold-700 text-white font-bold text-xs shadow-md shadow-cold-600/20 inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Reefer Truck</span>
            </button>
          )}

          {activeTab === 'geofences' && (
            <button
              onClick={() => setIsGeofenceModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cold-600 hover:bg-cold-700 text-white font-bold text-xs shadow-md shadow-cold-600/20 inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Define Geofence</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('live-tracking')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'live-tracking'
              ? 'border-cold-600 text-cold-600 dark:text-cold-400 bg-cold-50/50 dark:bg-cold-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>Live GPS Tracking</span>
        </button>

        <button
          onClick={() => setActiveTab('shipments')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'shipments'
              ? 'border-cold-600 text-cold-600 dark:text-cold-400 bg-cold-50/50 dark:bg-cold-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Reefer Shipments ({shipments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'vehicles'
              ? 'border-cold-600 text-cold-600 dark:text-cold-400 bg-cold-50/50 dark:bg-cold-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4 text-emerald-500" />
          <span>Fleet Vehicles ({vehicles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'routes'
              ? 'border-cold-600 text-cold-600 dark:text-cold-400 bg-cold-50/50 dark:bg-cold-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Send className="w-4 h-4 text-indigo-500" />
          <span>Route Management ({transitRoutes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('geofences')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'geofences'
              ? 'border-cold-600 text-cold-600 dark:text-cold-400 bg-cold-50/50 dark:bg-cold-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-500" />
          <span>Geofencing Security ({geofences.length})</span>
        </button>
      </div>

      {/* Tab: LIVE GPS TRACKING */}
      {activeTab === 'live-tracking' && (
        <div className="space-y-6">
          {/* Live Map Panel */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Highway Corridors</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">Live GPS updates every 3s</span>
            </div>
            <LeafletMap markers={mapMarkers} className="h-96" />
          </div>

          {/* Fleet Vehicles Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {vehicles.map(v => (
              <div key={v.id} className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{v.plate_number}</span>
                    <p className="text-[11px] text-slate-500 truncate">{v.model}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {v.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Thermometer className="w-3.5 h-3.5 text-cold-500" />
                    <span>Cargo Temp:</span>
                  </span>
                  <span className={`font-mono font-bold ${v.current_temp_c > v.max_temp_c ? 'text-rose-500' : 'text-cold-600 dark:text-cold-400'}`}>
                    {v.current_temp_c}°C
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Navigation className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Speed:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {v.current_speed_kmh} km/h
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Fuel className="w-3 h-3 text-amber-500" />
                    <span>Fuel: {v.fuel_pct}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Battery className="w-3 h-3 text-emerald-500" />
                    <span>Batt: {v.battery_pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: REEFER SHIPMENTS */}
      {activeTab === 'shipments' && (
        <DataTable
          columns={shipmentColumns}
          data={shipments}
          title="Active & Past Cold-Chain Shipments"
        />
      )}

      {/* Tab: FLEET VEHICLES */}
      {activeTab === 'vehicles' && (
        <DataTable
          columns={vehicleColumns}
          data={vehicles}
          title="Registered Refrigerated Fleet Vehicles"
        />
      )}

      {/* Tab: ROUTE MANAGEMENT */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Active Transit Corridors</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{transitRoutes.length}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">100% Monitored by GPS & IoT</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Average Transit Distance</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">242 km</div>
              <div className="text-[11px] text-slate-400 mt-1">Inter-facility express delivery</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">On-Time Arrival Rate</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">98.4%</div>
              <div className="text-[11px] text-slate-400 mt-1">Cold-chain compliant</div>
            </div>
          </div>

          <DataTable
            columns={routeColumns}
            data={transitRoutes}
            title="Optimized Agricultural Transit Corridors"
          />
        </div>
      )}

      {/* Tab: GEOFENCING SECURITY */}
      {activeTab === 'geofences' && (
        <div className="space-y-6">
          <DataTable
            columns={geofenceColumns}
            data={geofences}
            title="Active Facility & Delivery Geofence Perimeters"
          />

          <DataTable
            columns={geofenceEventColumns}
            data={geofenceEvents}
            title="Real-Time Boundary Enter & Exit Events (Audit Trail)"
          />
        </div>
      )}

      {/* Modal: Dispatch Shipment */}
      {isShipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Dispatch Refrigerated Shipment</h3>
            <form onSubmit={handleCreateShipment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Batch to Transport</label>
                <select
                  value={batchId}
                  onChange={e => setBatchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} - {b.product_name} ({b.quantity_kg} KG)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Reefer Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={e => setVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} - {v.model} (Cap: {v.capacity_kg} KG)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Certified Driver</label>
                <select
                  value={driverId}
                  onChange={e => setDriverId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.license_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Origin Facility</label>
                <input
                  type="text"
                  value={originName}
                  onChange={e => setOriginName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Destination Facility</label>
                <input
                  type="text"
                  value={destName}
                  onChange={e => setDestName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transit Distance (KM)</label>
                <input
                  type="number"
                  value={distanceKm}
                  onChange={e => setDistanceKm(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsShipmentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cold-600 hover:bg-cold-700 text-white font-bold rounded-xl shadow"
                >
                  Start Trip & Enable Telemetry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Reefer Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Register New Reefer Truck</h3>
            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">License Plate Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CA-REEFER-05"
                  value={newPlate}
                  onChange={e => setNewPlate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Model & Reefer Unit</label>
                <input
                  type="text"
                  required
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payload Capacity (KG)</label>
                <input
                  type="number"
                  required
                  value={newCapacity}
                  onChange={e => setNewCapacity(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newMinTemp}
                    onChange={e => setNewMinTemp(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newMaxTemp}
                    onChange={e => setNewMaxTemp(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cold-600 hover:bg-cold-700 text-white font-bold rounded-xl shadow"
                >
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Define Geofence */}
      {isGeofenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Define Security Geofence Perimeter</h3>
            <form onSubmit={handleCreateGeofence} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Perimeter Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salinas Farm Perimeter"
                  value={fenceName}
                  onChange={e => setFenceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Zone Category</label>
                <select
                  value={fenceZoneType}
                  onChange={e => setFenceZoneType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="FARM">Agricultural Farm Zone</option>
                  <option value="WAREHOUSE">Warehouse & Cold Hub</option>
                  <option value="DISTRIBUTION_HUB">Distribution Center</option>
                  <option value="DELIVERY">Retailer Delivery Destination</option>
                  <option value="RESTRICTED">Restricted Security Corridor</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Center Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={fenceLat}
                    onChange={e => setFenceLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Center Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={fenceLng}
                    onChange={e => setFenceLng(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  required
                  value={fenceRadius}
                  onChange={e => setFenceRadius(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsGeofenceModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cold-600 hover:bg-cold-700 text-white font-bold rounded-xl shadow"
                >
                  Activate Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
