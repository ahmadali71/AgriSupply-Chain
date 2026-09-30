import React from 'react';
import { X, ShieldAlert, CheckCircle2, Bell, AlertTriangle, Info } from 'lucide-react';
import { useSocket, AlertPacket } from '../context/SocketContext';
import { api } from '../services/api';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { liveAlerts, dismissAlert, clearAllAlerts } = useSocket();

  if (!isOpen) return null;

  const handleAcknowledge = async (id: string) => {
    await api.put(`/api/sensors/alerts/${id}/acknowledge`);
    dismissAlert(id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-agri-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cold-Chain Notification Center</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-bold">
                {liveAlerts.length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {liveAlerts.length > 0 && (
                <button
                  onClick={clearAllAlerts}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear all
                </button>
              )}
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {liveAlerts.length > 0 ? (
              liveAlerts.map(alert => {
                const isCritical = alert.severity === 'CRITICAL';
                const isWarning = alert.severity === 'WARNING';

                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCritical
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                        : isWarning
                        ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center space-x-1.5">
                        {isCritical ? (
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          {alert.alertType}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                      {alert.message}
                    </p>

                    {alert.readingValue !== undefined && (
                      <div className="text-[11px] font-mono text-slate-500 mb-2">
                        Telemetry: <strong>{alert.readingValue}°C</strong> • Limit: <strong>{alert.thresholdValue}°C</strong>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-2xs"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="text-xs font-medium">All cold-chain parameters within nominal limits.</p>
                <p className="text-[11px]">No active temperature violations detected.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
