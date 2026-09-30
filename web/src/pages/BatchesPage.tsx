import React, { useState, useEffect } from 'react';
import { Package, Plus, ClipboardCheck, History, QrCode, Wheat, Sprout, ArrowRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Batch } from '../types';
import { api } from '../services/api';
import { DataTable, Column } from '../components/DataTable';
import { DynamicInspectionModal } from '../components/DynamicInspectionModal';

interface BatchesPageProps {
  onOpenTrace: (batchNumber: string) => void;
  initialTab?: 'batches' | 'crops' | 'inspections';
}

export const BatchesPage: React.FC<BatchesPageProps> = ({ onOpenTrace, initialTab = 'batches' }) => {
  const [tab, setTab] = useState<'batches' | 'crops' | 'inspections'>(initialTab);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [selectedBatchForInspection, setSelectedBatchForInspection] = useState<Batch | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New batch fields
  const [productName, setProductName] = useState('Roma Tomatoes Grade A');
  const [quantityKg, setQuantityKg] = useState(5000);
  const [qualityGrade, setQualityGrade] = useState('GRADE_A');
  const [expiryDate, setExpiryDate] = useState('2026-10-30');
  const [minTemp, setMinTemp] = useState(2.0);
  const [maxTemp, setMaxTemp] = useState(8.0);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const fetchData = async () => {
    setIsLoading(true);
    const [batRes, crpRes, insRes] = await Promise.all([
      api.get<Batch[]>('/api/batches'),
      api.get<any[]>('/api/crops'),
      api.get<any[]>('/api/inspections')
    ]);

    if (batRes.success && batRes.data) setBatches(batRes.data);
    if (crpRes.success && crpRes.data) setCrops(crpRes.data);
    if (insRes.success && insRes.data) setInspections(insRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/batches', {
      crop_id: 'crp-01',
      farm_id: 'farm-01',
      harvest_id: 'hrv-01',
      product_name: productName,
      quantity_kg: quantityKg,
      quality_grade: qualityGrade,
      expiry_date: expiryDate,
      min_temp_c: minTemp,
      max_temp_c: maxTemp
    });

    if (res.success) {
      setIsCreateOpen(false);
      fetchData();
    } else {
      alert(res.error || 'Failed to create batch');
    }
  };

  const batchColumns: Column<Batch>[] = [
    {
      key: 'batch_number',
      header: 'Batch / Lot #',
      render: (b) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Package className="w-3.5 h-3.5 text-agri-600" />
            <span>{b.batch_number}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">{b.product_name}</div>
        </div>
      )
    },
    {
      key: 'quantity_kg',
      header: 'Yield Quantity',
      render: (b) => <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{(b.quantity_kg ?? 0).toLocaleString()} kg</span>
    },
    {
      key: 'quality_grade',
      header: 'Grade',
      render: (b) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          {b.quality_grade}
        </span>
      )
    },
    {
      key: 'temp_requirements',
      header: 'Reefer Temp',
      render: (b) => (
        <span className="font-mono text-xs text-cold-600 dark:text-cold-400">
          {b.min_temp_c}°C – {b.max_temp_c}°C
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => {
        const isApproved = b.status === 'APPROVED';
        const isPending = b.status === 'INSPECTION_PENDING' || b.status === 'CREATED';
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
            isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {b.status}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Trace & QA Actions',
      render: (b) => (
        <div className="flex items-center space-x-2">
          {b.status === 'INSPECTION_PENDING' && (
            <button
              onClick={() => setSelectedBatchForInspection(b)}
              className="px-2.5 py-1 rounded-lg bg-agri-600 hover:bg-agri-700 text-white text-xs font-semibold inline-flex items-center space-x-1 shadow-2xs"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Inspect</span>
            </button>
          )}
          <button
            onClick={() => onOpenTrace(b.batch_number)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center space-x-1"
          >
            <History className="w-3.5 h-3.5 text-cold-500" />
            <span>Trace</span>
          </button>
        </div>
      )
    }
  ];

  const cropColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'Crop Variety',
      render: (c) => (
        <div className="flex items-center space-x-2">
          <Wheat className="w-4 h-4 text-amber-600" />
          <div>
            <div className="font-bold text-slate-900 dark:text-white">{c.name || c.variety || 'Crop Lot'}</div>
            <div className="text-[11px] text-slate-400">{c.farm_name || 'Salinas Plot 4'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'dates',
      header: 'Planting / Harvest',
      render: (c) => (
        <div className="text-xs">
          <div className="text-slate-700 dark:text-slate-300">Planted: {c.planting_date || '2026-05-10'}</div>
          <div className="text-slate-400 text-[11px]">Harvest: {c.expected_harvest_date || '2026-09-15'}</div>
        </div>
      )
    },
    {
      key: 'yield',
      header: 'Expected / Actual Yield',
      render: (c) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-emerald-600">{c.actual_yield_kg ? `${c.actual_yield_kg} kg` : `${c.expected_yield_kg || 25000} kg`}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Growth Stage',
      render: (c) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          {c.status || 'HARVEST_READY'}
        </span>
      )
    }
  ];

  const inspectionColumns: Column<any>[] = [
    {
      key: 'batch',
      header: 'Batch Inspected',
      render: (i) => (
        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
          <ClipboardCheck className="w-3.5 h-3.5 text-agri-600" />
          <span>{i.batch_number || i.batch_id}</span>
        </div>
      )
    },
    {
      key: 'inspector',
      header: 'Inspector',
      render: (i) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{i.inspector_name || 'Inspector Alex'}</div>
          <div className="text-[11px] text-slate-400">{i.inspection_date ? new Date(i.inspection_date).toLocaleDateString() : 'Recent'}</div>
        </div>
      )
    },
    {
      key: 'metrics',
      header: 'Measured Parameters',
      render: (i) => (
        <div className="text-xs space-y-0.5">
          <div>Temp: <span className="font-mono font-bold text-cold-600">{i.measured_temp_c}°C</span></div>
          <div className="text-slate-400 text-[11px]">Visual: {i.visual_score}/10 • Damage: {i.damage_pct}%</div>
        </div>
      )
    },
    {
      key: 'result',
      header: 'QA Decision',
      render: (i) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
          i.result === 'PASSED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
          i.result === 'CONDITIONAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
        }`}>
          {i.result}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Package className="w-5 h-5 text-agri-600" />
            <span>Produce Batches, Crops & Quality Control</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            GS1 batch lot tracking, dynamic multi-attribute quality inspections, and crop harvest records.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('batches')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'batches'
                ? 'bg-white dark:bg-slate-700 text-agri-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Batches ({batches.length})
          </button>
          <button
            onClick={() => setTab('crops')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'crops'
                ? 'bg-white dark:bg-slate-700 text-agri-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Crops & Harvests ({crops.length})
          </button>
          <button
            onClick={() => setTab('inspections')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'inspections'
                ? 'bg-white dark:bg-slate-700 text-agri-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Quality Inspections ({inspections.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {tab === 'batches' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-agri-600 hover:bg-agri-700 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Produce Batch</span>
            </button>
          </div>
          <DataTable data={batches} columns={batchColumns} searchPlaceholder="Search batches, produce, grades..." />
        </div>
      )}

      {tab === 'crops' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Crop Cultivations & Harvest Schedules</h3>
          <DataTable data={crops} columns={cropColumns} searchPlaceholder="Search crops, farms, varieties..." />
        </div>
      )}

      {tab === 'inspections' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Completed Quality Inspection Audits</h3>
          <DataTable data={inspections} columns={inspectionColumns} searchPlaceholder="Search QA results, inspectors..." />
        </div>
      )}

      {/* Create Batch Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Generate Unique GS1 Batch / Lot</h3>
            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity (KG)</label>
                  <input
                    type="number"
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quality Grade</label>
                  <select
                    value={qualityGrade}
                    onChange={(e) => setQualityGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="GRADE_A">Grade A (Export / Premium)</option>
                    <option value="GRADE_B">Grade B (Standard Commercial)</option>
                    <option value="GRADE_C">Grade C (Processing)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={minTemp}
                    onChange={(e) => setMinTemp(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={maxTemp}
                    onChange={(e) => setMaxTemp(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-agri-600 text-white font-bold"
                >
                  Generate Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic 10-Step Quality Inspection Modal */}
      {selectedBatchForInspection && (
        <DynamicInspectionModal
          batch={selectedBatchForInspection}
          onClose={() => setSelectedBatchForInspection(null)}
          onSuccess={() => {
            setSelectedBatchForInspection(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
