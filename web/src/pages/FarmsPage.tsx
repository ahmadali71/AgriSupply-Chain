import React, { useState, useEffect } from 'react';
import { Sprout, MapPin, CloudSun, Plus, Search, CheckCircle2, Phone, Award } from 'lucide-react';
import { Farm } from '../types';
import { api } from '../services/api';
import { DataTable, Column } from '../components/DataTable';

export const FarmsPage: React.FC = () => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [farmWeather, setFarmWeather] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Farm form
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(36.6777);
  const [longitude, setLongitude] = useState(-121.6555);
  const [sizeAcres, setSizeAcres] = useState(150);
  const [cropTypes, setCropTypes] = useState('Organic Berries, Romaine');
  const [capacityTons, setCapacityTons] = useState(400);
  const [certification, setCertification] = useState('USDA_ORGANIC');

  const fetchFarms = async () => {
    setIsLoading(true);
    const res = await api.get<Farm[]>('/api/farms');
    if (res.success && res.data) {
      setFarms(res.data);
      if (res.data.length > 0 && !selectedFarm) {
        loadFarmDetail(res.data[0]);
      }
    }
    setIsLoading(false);
  };

  const loadFarmDetail = async (farm: Farm) => {
    setSelectedFarm(farm);
    const res = await api.get<any>(`/api/farms/${farm.id}`);
    if (res.success && res.data?.weather) {
      setFarmWeather(res.data.weather);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/farms', {
      farmer_id: 'frm-001',
      name,
      location,
      latitude,
      longitude,
      size_acres: sizeAcres,
      crop_types: cropTypes,
      capacity_tons: capacityTons,
      certification
    });

    if (res.success) {
      setIsModalOpen(false);
      fetchFarms();
    } else {
      alert(res.error || 'Failed to create farm');
    }
  };

  const columns: Column<Farm>[] = [
    {
      key: 'name',
      header: 'Farm Name',
      render: (f) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
            <Sprout className="w-3.5 h-3.5 text-agri-600" />
            <span>{f.name}</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>{f.location}</span>
          </div>
        </div>
      )
    },
    {
      key: 'farmer_name',
      header: 'Grower / Farmer',
      render: (f) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{f.farmer_name || 'Grower'}</div>
          <div className="text-[11px] text-slate-400">{f.cooperative_name || 'Direct'}</div>
        </div>
      )
    },
    {
      key: 'crop_types',
      header: 'Crops Produced',
      render: (f) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{f.crop_types}</span>
      )
    },
    {
      key: 'size_acres',
      header: 'Size',
      render: (f) => <span>{f.size_acres} Acres</span>
    },
    {
      key: 'certification',
      header: 'Certification',
      render: (f) => (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <Award className="w-3 h-3 mr-0.5" />
          <span>{f.certification?.replace('_', ' ')}</span>
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Farm Management & Field Cultivation</h2>
          <p className="text-xs text-slate-500">Monitor certified agricultural origins, harvest planning, and microclimate weather data.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-agri-600 hover:bg-agri-700 text-white font-bold text-xs shadow-md shadow-agri-600/20 inline-flex items-center space-x-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Farm</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Farm Table (2 Cols) */}
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={farms}
            title="Registered Production Farms"
            onRowClick={(f) => loadFarmDetail(f)}
          />
        </div>

        {/* Selected Farm & Live Weather Card (1 Col) */}
        <div>
          {selectedFarm ? (
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Farm Origin</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-agri-100 text-agri-800 dark:bg-agri-950 dark:text-agri-300">
                  {selectedFarm.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedFarm.name}</h3>
                <p className="text-xs text-slate-500">{selectedFarm.location}</p>
                <p className="text-xs font-mono text-agri-600 dark:text-agri-400 mt-1">
                  GPS: {selectedFarm.latitude}, {selectedFarm.longitude}
                </p>
              </div>

              {/* Weather API Integration Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cold-50 to-blue-50/50 dark:from-slate-800 dark:to-slate-800/60 border border-cold-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-cold-900 dark:text-cold-300">
                    <CloudSun className="w-4 h-4 text-amber-500" />
                    <span>Live Microclimate Telemetry</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cold-100 dark:bg-cold-950 text-cold-700 dark:text-cold-300 border border-cold-200 dark:border-cold-800">
                    {farmWeather?.source === 'LIVE_WEATHER_API' ? 'WeatherAPI.com Live' : farmWeather?.source === 'LIVE_OPEN_METEO' ? 'Open-Meteo Live' : 'Agro-Climate Model'}
                  </span>
                </div>

                {farmWeather ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                          {farmWeather.temperatureC}°C
                        </span>
                        <span className="text-slate-500 font-medium">{farmWeather.condition}</span>
                      </div>
                      {farmWeather.icon && (
                        <img src={farmWeather.icon} alt={farmWeather.condition} className="w-10 h-10 object-contain drop-shadow" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                      <div>Humidity: <strong>{farmWeather.humidityPct}%</strong></div>
                      <div>Wind: <strong>{farmWeather.windSpeedKmh} km/h</strong></div>
                      <div>Precipitation: <strong>{farmWeather.precipitationMm} mm</strong></div>
                      <div>Frost Risk: <strong className={farmWeather.frostRisk === 'HIGH' ? 'text-rose-500' : 'text-emerald-500'}>{farmWeather.frostRisk}</strong></div>
                      {farmWeather.feelslikeC !== undefined && (
                        <div>Feels Like: <strong>{farmWeather.feelslikeC}°C</strong></div>
                      )}
                      {farmWeather.uvIndex !== undefined && (
                        <div>UV Index: <strong>{farmWeather.uvIndex}</strong></div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-2">Loading live meteorological telemetry...</div>
                )}
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Irrigation System:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedFarm.irrigation_type}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Production Capacity:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedFarm.capacity_tons} Tons/yr</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedFarm.contact_phone || '+1-555-7001'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-3xl text-center text-slate-400 text-xs">
              Select a farm from the directory to inspect coordinates and microclimate.
            </div>
          )}
        </div>
      </div>

      {/* New Farm Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Production Farm</h3>
            <form onSubmit={handleCreateFarm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Farm Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Salinas Organic Valley Farm"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Location Description</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Salinas Valley, CA"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={e => setLatitude(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={e => setLongitude(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Size (Acres)</label>
                  <input
                    type="number"
                    value={sizeAcres}
                    onChange={e => setSizeAcres(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Capacity (Tons)</label>
                  <input
                    type="number"
                    value={capacityTons}
                    onChange={e => setCapacityTons(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Crops Produced</label>
                <input
                  type="text"
                  value={cropTypes}
                  onChange={e => setCropTypes(e.target.value)}
                  placeholder="Strawberries, Romaine Lettuce"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-agri-600 hover:bg-agri-700 text-white font-bold rounded-xl shadow"
                >
                  Save Farm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
