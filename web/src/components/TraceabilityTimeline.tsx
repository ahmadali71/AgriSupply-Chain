import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, Clock, MapPin, Thermometer, ShieldCheck, QrCode, FileText } from 'lucide-react';
import { api } from '../services/api';

interface TraceabilityProps {
  initialBatchNumber?: string;
}

export const TraceabilityTimeline: React.FC<TraceabilityProps> = ({ initialBatchNumber = 'BATCH-2026-TOM-000101' }) => {
  const [searchTerm, setSearchTerm] = useState(initialBatchNumber);
  const [traceData, setTraceData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrace = async (identifier: string) => {
    if (!identifier.trim()) return;
    setIsLoading(true);
    setError(null);
    const res = await api.get<any>(`/api/batches/trace/${identifier.trim()}`);
    setIsLoading(false);
    if (res.success && res.data) {
      setTraceData(res.data);
    } else {
      setError(res.error || 'Batch not found. Try BATCH-2026-TOM-000101 or BATCH-2026-STR-000204');
    }
  };

  useEffect(() => {
    fetchTrace(initialBatchNumber);
  }, [initialBatchNumber]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          End-to-End Batch Provenance & Cold-Chain Traceability
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Scan QR code or enter batch number to verify full chain of custody from seed to supermarket shelf.
        </p>

        <form onSubmit={e => { e.preventDefault(); fetchTrace(searchTerm); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="e.g. BATCH-2026-TOM-000101"
              className="w-full pl-10 pr-4 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-agri-600 hover:bg-agri-700 text-white font-bold text-xs shadow-md shadow-agri-600/20 disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Trace Batch'}
          </button>
        </form>

        {/* Quick sample chips */}
        <div className="flex items-center space-x-2 mt-3 text-xs text-slate-400">
          <span>Sample lots:</span>
          {['BATCH-2026-TOM-000101', 'BATCH-2026-STR-000204', 'BATCH-2026-CIT-000305'].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => { setSearchTerm(chip); fetchTrace(chip); }}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono hover:text-agri-600"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      {traceData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Provenance Summary Card */}
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lot Identity</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {traceData.batch.status}
                </span>
              </div>

              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {traceData.batch.product_name}
              </h4>
              <p className="text-xs font-mono text-agri-600 dark:text-agri-400 font-bold mb-4">
                {traceData.batch.batch_number}
              </p>

              {/* QR Code representation */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center mb-4">
                <QrCode className="w-28 h-28 text-slate-900" />
                <span className="text-[10px] text-slate-500 mt-2 font-mono text-center">
                  Scannable Digital GS1-Compliant Barcode
                </span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Origin Farm:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{traceData.batch.farm_name}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Harvest Date:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{traceData.batch.harvest_date}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Harvest Yield:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{traceData.batch.quantity_kg} KG</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Cold Chain Limits:</span>
                  <span className="font-semibold text-cold-600 dark:text-cold-400">{traceData.batch.min_temp_c}°C to {traceData.batch.max_temp_c}°C</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Certification:</span>
                  <span className="font-semibold text-emerald-600">{traceData.batch.certification}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Chronological Provenance Timeline */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">
              Complete Chain of Custody Timeline
            </h4>

            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              {traceData.timeline.map((event: any, idx: number) => (
                <div key={idx} className="relative">
                  {/* Step dot */}
                  <div className="absolute -left-[30px] top-0 w-6 h-6 rounded-full bg-agri-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white dark:ring-slate-900 shadow">
                    {event.step}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {event.title}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{event.timestamp}</span>
                      </span>
                    </div>

                    <div className="text-xs text-agri-700 dark:text-agri-400 font-semibold mb-2 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{event.location}</span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                      Responsible Actor: <strong>{event.actor}</strong>
                    </div>

                    {/* Key details table / tags */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      {Object.entries(event.details).map(([k, v]: any) => (
                        <div key={k}>
                          <span className="text-slate-400 block capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
