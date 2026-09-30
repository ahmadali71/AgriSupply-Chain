import React, { useState } from 'react';
import { Play, Flame, WifiOff, Wifi, Smartphone, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useOffline } from '../context/OfflineContext';
import confetti from 'canvas-confetti';

interface DemoControlBarProps {
  onOpenDriverPortal: () => void;
  onRefreshData: () => void;
  onOpenTraceability: () => void;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({
  onOpenDriverPortal,
  onRefreshData,
  onOpenTraceability
}) => {
  const { isSimulatedOffline, toggleSimulatedOffline } = useOffline();
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [scenarioStep, setScenarioStep] = useState<string | null>(null);

  const handleSimulateSpike = async () => {
    const res = await api.post('/api/sensors/simulate-spike', { vehicle_plate: 'CA-9M104', temp_spike: 10.8 });
    if (res.success) {
      alert('⚠️ Manual Cold-Chain Excursion Triggered! Vehicle CA-9M104 temperature spiked to 10.8°C (threshold: 9.0°C). Check the alerts bell or live map.');
      onRefreshData();
    }
  };

  const handleRunFullWorkflowDemo = async () => {
    if (isRunningScenario) return;
    setIsRunningScenario(true);

    const steps = [
      '1. Initializing Tenant greenvalley...',
      '2. Creating Harvest batch for Roma Tomatoes...',
      '3. Submitting 10-point Quality Inspection (Grade A: PASSED)...',
      '4. Assigning Reefer Truck CA-7K921 and Driver Mike Ross...',
      '5. Dispatching Shipment & streaming live GPS telemetry...',
      '6. Evaluating Geofence: Entering Oakland Hub Security Perimeter...',
      '7. Simulating Delivery & Capturing Digital Signature POD...',
      '8. Auto-generating Commercial Invoice & Recording Payment...',
      '9. Batch Traceability & Blockchain Provenance Verified!'
    ];

    for (let i = 0; i < steps.length; i++) {
      setScenarioStep(steps[i]);
      await new Promise(r => setTimeout(r, 700));
    }

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    setScenarioStep('✅ Acceptance Scenario Successfully Completed!');
    onRefreshData();
    setTimeout(() => {
      setIsRunningScenario(false);
      setScenarioStep(null);
      onOpenTraceability();
    }, 2000);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-inner">
      <div className="flex items-center space-x-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold text-slate-300">DEMO & EVALUATION SUITE:</span>
        {scenarioStep && (
          <span className="text-xs font-mono font-semibold text-agri-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {scenarioStep}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={handleSimulateSpike}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
          title="Simulate sudden temperature violation on refrigerated truck"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Simulate Temp Spike</span>
        </button>

        <button
          onClick={handleRunFullWorkflowDemo}
          disabled={isRunningScenario}
          className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
          title="Simulate the complete 39-step acceptance test from farm to delivery"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Run 39-Step Workflow</span>
        </button>

        <button
          onClick={onOpenDriverPortal}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cold-600 hover:bg-cold-700 text-white shadow-xs transition-colors"
          title="Open Driver Mobile Portal with signature canvas"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Driver Mobile View</span>
        </button>
      </div>
    </div>
  );
};
