import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Sparkles, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('30D');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    const res = await api.get<any[]>('/api/analytics/predictive');
    if (res.success && res.data) {
      setPredictions(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cold-600" />
            <span>Supply Chain Analytics & Predictive Deck</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time loss telemetry, cold-chain temperature variance, and AI-driven shelf-life forecasting.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start">
          {['Today', '7D', '30D', '3M', '1Y'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                dateRange === range
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Predictive Intelligence Section */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Predictive Risk Models & Mitigations
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.map(pred => {
            const isHigh = pred.riskLevel === 'HIGH' || pred.riskLevel === 'CRITICAL';
            return (
              <div
                key={pred.id}
                className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {pred.category.replace(/_/g, ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{pred.title}</h4>
                    <p className="text-[11px] font-medium text-slate-500">{pred.subject}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isHigh ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    }`}>
                      {pred.riskLevel} RISK ({pred.probabilityPct}%)
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <strong>Risk Assessment:</strong> {pred.reason}
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
                  <span className="text-agri-700 dark:text-agri-400 font-bold block mb-0.5">Recommended Action:</span>
                  <span className="text-slate-700 dark:text-slate-300">{pred.recommendedAction}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cold-Chain Thermal Drift</h4>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">±0.4°C Variance</div>
          <p className="text-xs text-slate-500">
            Average thermal deviation across all active reefer trucks is tightly contained within the 2.0°C–8.0°C envelope.
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-emerald-500 h-full rounded-full w-[94%]" />
          </div>
          <span className="text-[11px] font-semibold text-emerald-600">94.2% Optimal Thermal Retention</span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fleet Reefer Utilization</h4>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">88.5% Occupancy</div>
          <p className="text-xs text-slate-500">
            Current refrigerated cargo payload capacity utilized vs empty haulage runs across California.
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-cold-500 h-full rounded-full w-[88%]" />
          </div>
          <span className="text-[11px] font-semibold text-cold-600">High efficiency freight density</span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shrinkage & Spoilage</h4>
          <div className="text-2xl font-extrabold text-emerald-600">1.8% Loss</div>
          <p className="text-xs text-slate-500">
            Industry baseline benchmark is 4.5%. Real-time IoT alerts prevented 34 tons of potential decay.
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-emerald-500 h-full rounded-full w-[18%]" />
          </div>
          <span className="text-[11px] font-semibold text-emerald-600">Exceeds industry SLA targets</span>
        </div>
      </div>
    </div>
  );
};
