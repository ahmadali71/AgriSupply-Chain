import React, { useState, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, FileText, Download, ChevronRight, ChevronLeft } from 'lucide-react';
import { Batch } from '../types';
import { api } from '../services/api';
import { useOffline } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';

interface DynamicInspectionModalProps {
  batch: Batch;
  onClose: () => void;
  onSuccess: () => void;
}

export const DynamicInspectionModal: React.FC<DynamicInspectionModalProps> = ({ batch, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { isOnline, recordOfflineAction } = useOffline();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInspId, setCreatedInspId] = useState<string | null>(null);

  // Form states
  const [productType, setProductType] = useState('VEGETABLES');
  const [visualScore, setVisualScore] = useState(9.2);
  const [weightKg, setWeightKg] = useState(batch.quantity_kg);
  const [sizeMm, setSizeMm] = useState(68);
  const [moisturePct, setMoisturePct] = useState(90.5);
  const [measuredTempC, setMeasuredTempC] = useState(4.2);
  const [packagingIntegrity, setPackagingIntegrity] = useState('INTACT_VENTILATED');
  const [contaminationDetected, setContaminationDetected] = useState(false);
  const [damagePct, setDamagePct] = useState(0.5);
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [result, setResult] = useState<'PASSED' | 'FAILED' | 'CONDITIONAL'>('PASSED');
  const [inspectorSignature, setInspectorSignature] = useState(user?.full_name || 'Alex Wong (Lead Inspector)');
  const [notes, setNotes] = useState('All cold chain criteria satisfied. Fruit firm and pre-chilled.');

  const isTempExceeded = measuredTempC > batch.max_temp_c;

  const handleSubmit = async () => {
    if (isTempExceeded && !correctiveAction.trim()) {
      alert(`Temperature (${measuredTempC}°C) exceeds max threshold (${batch.max_temp_c}°C). Corrective action is required!`);
      return;
    }

    setIsSubmitting(true);
    const payload = {
      batch_id: batch.id,
      batchId: batch.id,
      product_type: productType,
      productType,
      visual_score: visualScore,
      visualScore,
      weight_kg: weightKg,
      weightKg,
      size_mm: sizeMm,
      sizeMm,
      moisture_pct: moisturePct,
      moisturePct,
      measured_temp_c: measuredTempC,
      measuredTempC,
      packaging_integrity: packagingIntegrity,
      packagingIntegrity,
      contamination_detected: contaminationDetected,
      contaminationDetected,
      damage_pct: damagePct,
      damagePct,
      corrective_action: correctiveAction,
      correctiveAction,
      result,
      inspector_signature: inspectorSignature,
      inspectorSignature,
      inspector_notes: notes,
      inspectorNotes: notes,
      images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop'],
      gps_lat: 36.6778,
      gps_lng: -121.6554
    };

    if (!isOnline) {
      recordOfflineAction('INSPECTION', 'CREATE', payload);
      setIsSubmitting(false);
      alert('Network is offline. Quality inspection saved locally and will auto-sync when online!');
      onSuccess();
      onClose();
      return;
    }

    const res = await api.post<any>('/api/inspections', payload);
    setIsSubmitting(false);

    if (res.success) {
      setCreatedInspId(res.data?.id || 'new');
      onSuccess();
    } else {
      alert(res.error || 'Failed to submit inspection');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Dynamic Quality Inspection</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-agri-100 dark:bg-agri-950 text-agri-700 dark:text-agri-400 font-semibold">
                {batch.batch_number}
              </span>
            </h3>
            <p className="text-xs text-slate-500">Stage {step} of 4 • {batch.product_name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Stages */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {createdInspId ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Inspection Successfully Recorded!</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Batch status has been officially updated to <strong className="text-agri-600">{result === 'PASSED' ? 'APPROVED' : result}</strong>. Tamper-evident quality hash has been logged to the blockchain audit trail.
              </p>
              <div className="pt-3 flex justify-center space-x-3">
                <a
                  href={`/api/inspections/${createdInspId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-agri-600 text-white font-semibold text-xs hover:bg-agri-700 shadow-md shadow-agri-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Official PDF Certificate</span>
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Product Categorization & Visual */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Produce Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['VEGETABLES', 'FRUITS', 'BERRIES'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setProductType(t)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                            productType === t ? 'border-agri-600 bg-agri-50 dark:bg-agri-950 text-agri-700 dark:text-agri-400' : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Visual Quality Score (0 - 10)</span>
                      <span className="text-agri-600 font-extrabold">{visualScore} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.1"
                      value={visualScore}
                      onChange={e => setVisualScore(parseFloat(e.target.value))}
                      className="w-full accent-agri-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Inspected Weight (KG)</label>
                      <input
                        type="number"
                        value={weightKg}
                        onChange={e => setWeightKg(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Average Caliber/Size (mm)</label>
                      <input
                        type="number"
                        value={sizeMm}
                        onChange={e => setSizeMm(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Cold-Chain Telemetry & Moisture */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-cold-50 dark:bg-cold-950/60 border border-cold-200 dark:border-cold-800">
                    <div className="text-xs font-bold text-cold-900 dark:text-cold-300 mb-1">Permitted Temperature Bounds</div>
                    <div className="text-xs text-cold-700 dark:text-cold-400">
                      Minimum: <strong>{batch.min_temp_c}°C</strong> • Maximum: <strong>{batch.max_temp_c}°C</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Core Pulp Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={measuredTempC}
                      onChange={e => setMeasuredTempC(parseFloat(e.target.value))}
                      className={`w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-sm ${
                        isTempExceeded ? 'border-rose-500 text-rose-600 bg-rose-50/50' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                  </div>

                  {/* Conditional Warning */}
                  {isTempExceeded && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span>Warning: Temperature Limit Exceeded!</span>
                      </div>
                      <p className="text-[11px]">
                        The recorded pulp temperature ({measuredTempC}°C) exceeds the maximum safe limit ({batch.max_temp_c}°C). A corrective action plan is mandatory to approve this batch.
                      </p>
                      <input
                        type="text"
                        value={correctiveAction}
                        onChange={e => setCorrectiveAction(e.target.value)}
                        placeholder="Specify mandatory corrective pre-cooling action..."
                        className="w-full mt-2 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Internal Moisture Content (%)</span>
                      <span className="text-cold-600 font-extrabold">{moisturePct}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="0.5"
                      value={moisturePct}
                      onChange={e => setMoisturePct(parseFloat(e.target.value))}
                      className="w-full accent-cold-600"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Packaging & Contamination */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Packaging Integrity</label>
                    <select
                      value={packagingIntegrity}
                      onChange={e => setPackagingIntegrity(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="INTACT_VENTILATED">Intact Corrugated Vented Crates</option>
                      <option value="CLAMSHELL_SEALED">Sealed Clamshells</option>
                      <option value="BULK_BIN_WOODEN">Bulk Heavy Duty Bins</option>
                      <option value="COMPROMISED_BOX">Compromised / Crushed (Fail)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Physical Surface Damage (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={damagePct}
                      onChange={e => setDamagePct(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="contam"
                      checked={contaminationDetected}
                      onChange={e => setContaminationDetected(e.target.checked)}
                      className="rounded accent-rose-600"
                    />
                    <label htmlFor="contam" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Foreign Contamination / Pest Detected
                    </label>
                  </div>
                </div>
              )}

              {/* Step 4: Final Decision & Signature */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Final Inspector Decision</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['PASSED', 'CONDITIONAL', 'FAILED'] as const).map(res => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => setResult(res)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                            result === res
                              ? res === 'PASSED'
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold'
                                : res === 'CONDITIONAL'
                                ? 'border-amber-600 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-extrabold'
                                : 'border-rose-600 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-extrabold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Auditor Digital Signature</label>
                    <input
                      type="text"
                      value={inspectorSignature}
                      onChange={e => setInspectorSignature(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Auditor Technical Notes</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        {!createdInspId && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-800/50">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="inline-flex items-center space-x-1 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="inline-flex items-center space-x-1 px-4 py-2 text-xs font-bold bg-agri-600 text-white rounded-xl hover:bg-agri-700"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Recording Inspection...' : 'Finalize & Issue Certificate'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
