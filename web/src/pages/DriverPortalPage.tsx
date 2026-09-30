import React, { useState, useEffect } from 'react';
import {
  Truck, MapPin, Thermometer, CheckCircle2, ShieldCheck,
  Wifi, WifiOff, RefreshCw, PenTool, Navigation, Package
} from 'lucide-react';
import { Shipment } from '../types';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useOffline } from '../context/OfflineContext';
import { ProofOfDeliveryModal } from '../components/ProofOfDeliveryModal';

export const DriverPortalPage: React.FC = () => {
  const { latestTelemetry } = useSocket();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, pendingCount, isSyncing, syncNow } = useOffline();

  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [podOpen, setPodOpen] = useState(false);
  const [tripStatus, setTripStatus] = useState('IN_TRANSIT');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchDriverTrip = async () => {
    const res = await api.get<Shipment[]>('/api/logistics/shipments');
    if (res.success && res.data && res.data.length > 0) {
      // Find an in-transit trip
      const inTransit = res.data.find(s => s.status === 'IN_TRANSIT') || res.data[0];
      setActiveShipment(inTransit);
      setTripStatus(inTransit.status);
    }
  };

  useEffect(() => {
    fetchDriverTrip();
  }, []);

  const handleManualSync = async () => {
    const res = await syncNow();
    if (res.success) {
      setSyncMessage(`Synced ${res.synced} offline actions successfully!`);
      setTimeout(() => setSyncMessage(null), 4000);
      fetchDriverTrip();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-12">
      {/* Offline Status Top Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs ${
        isOnline
          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
      }`}>
        <div className="flex items-center space-x-2.5">
          {isOnline ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center animate-bounce">
              <WifiOff className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="text-xs font-bold">
              {isOnline ? 'Network Online & Synchronized' : 'Offline Mode (Local Storage Resilient)'}
            </div>
            <div className="text-[11px] opacity-80">
              {isOnline ? 'GPS & Telemetry streaming to cloud' : `${pendingCount} changes stored safely on device`}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {pendingCount > 0 && isOnline && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700"
            >
              {isSyncing ? 'Syncing...' : 'Sync Queue'}
            </button>
          )}
          <button
            onClick={toggleSimulatedOffline}
            className="text-[11px] font-bold px-2 py-1 rounded-lg border border-current opacity-90 hover:opacity-100"
          >
            {isSimulatedOffline ? 'Go Online' : 'Simulate Offline'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold text-center animate-fade-in">
          {syncMessage}
        </div>
      )}

      {/* Driver Active Trip Card */}
      {activeShipment ? (
        <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg space-y-4 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Reefer Route</span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                {activeShipment.shipment_number}
              </h3>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              activeShipment.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800 animate-pulse'
            }`}>
              {activeShipment.status}
            </span>
          </div>

          {/* Route info */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3 text-xs">
              <div className="flex flex-col items-center pt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-agri-600"></div>
                <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-700 my-0.5"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div>
              </div>
              <div className="flex-1 space-y-2.5">
                <div>
                  <span className="text-slate-400 block text-[10px]">Origin:</span>
                  <strong className="text-slate-900 dark:text-white">{activeShipment.origin_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Destination:</span>
                  <strong className="text-slate-900 dark:text-white">{activeShipment.destination_name}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Reefer Cargo Telemetry Gauge */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cold-500/10 via-agri-500/10 to-transparent border border-cold-200 dark:border-cold-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cold-600 text-white flex items-center justify-center shadow-md">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cargo Temperature</div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {latestTelemetry?.temperatureC || activeShipment.current_temp_c || 4.2}°C
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500">
              <div>Safe Window:</div>
              <strong className="text-cold-600 dark:text-cold-400 font-mono">
                {activeShipment.required_min_temp_c}°C – {activeShipment.required_max_temp_c}°C
              </strong>
            </div>
          </div>

          {/* Cargo Payload Info */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Cargo:</span>
              <span className="font-bold text-slate-900 dark:text-white">{activeShipment.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Batch Code:</span>
              <span className="font-mono text-agri-600 font-bold">{activeShipment.batch_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Driver License:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{activeShipment.driver_name}</span>
            </div>
          </div>

          {/* Delivery POD Action Button */}
          {activeShipment.status !== 'DELIVERED' ? (
            <button
              onClick={() => setPodOpen(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-agri-600 hover:from-emerald-700 hover:to-agri-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-98"
            >
              <PenTool className="w-4 h-4" />
              <span>Arrive at Dock & Collect Signature (POD)</span>
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Delivery Completed & Signed Off!</span>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-3xl text-center text-slate-400 text-xs">
          No active shipments assigned today.
        </div>
      )}

      {/* Proof of Delivery Modal */}
      {podOpen && activeShipment && (
        <ProofOfDeliveryModal
          shipment={activeShipment}
          onClose={() => setPodOpen(false)}
          onSuccess={() => {
            fetchDriverTrip();
          }}
        />
      )}
    </div>
  );
};
