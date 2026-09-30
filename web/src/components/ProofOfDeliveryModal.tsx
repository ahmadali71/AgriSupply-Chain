import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle2, PenTool, RotateCcw, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Shipment } from '../types';
import { api } from '../services/api';
import { useOffline } from '../context/OfflineContext';

interface ProofOfDeliveryModalProps {
  shipment: Shipment;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({ shipment, onClose, onSuccess }) => {
  const { isOnline, recordOfflineAction } = useOffline();

  const [receiverName, setReceiverName] = useState('Marcus Brody (Store Receiving Mgr)');
  const [deliveredQtyKg, setDeliveredQtyKg] = useState(2600);
  const [damagedQtyKg, setDamagedQtyKg] = useState(0);
  const [deliveryNotes, setDeliveryNotes] = useState('All cartons inspected. Temperature nominal at 4.1°C upon dock arrival.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<string | null>(null);

  // HTML5 Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!receiverName.trim()) {
      alert('Receiver name is required');
      return;
    }

    const canvas = canvasRef.current;
    const signatureData = canvas && hasSignature
      ? canvas.toDataURL('image/png')
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M10,40 Q50,10 90,40 T180,30" stroke="black" stroke-width="2" fill="none"/></svg>';

    setIsSubmitting(true);
    const payload = {
      shipment_id: shipment.id,
      shipmentId: shipment.id,
      order_id: shipment.order_id,
      orderId: shipment.order_id,
      receiver_name: receiverName,
      receiverName,
      receiver_signature_data: signatureData,
      receiverSignatureData: signatureData,
      receiver_photo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop',
      gps_lat: shipment.destination_lat || 37.7699,
      gps_lng: shipment.destination_lng || -122.4271,
      delivered_qty_kg: deliveredQtyKg,
      deliveredQtyKg,
      damaged_qty_kg: damagedQtyKg,
      damagedQtyKg,
      delivery_notes: deliveryNotes,
      deliveryNotes
    };

    if (!isOnline) {
      recordOfflineAction('DELIVERY_POD', 'CREATE', payload);
      setIsSubmitting(false);
      setCompletedReceipt(`OFFLINE-POD-${Date.now().toString().slice(-4)}`);
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      onSuccess();
      return;
    }

    const res = await api.post<any>('/api/deliveries', payload);
    setIsSubmitting(false);

    if (res.success) {
      setCompletedReceipt(res.receiptNumber || 'POD-CONFIRMED');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onSuccess();
    } else {
      alert(res.error || 'Failed to submit delivery');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Digital Proof of Delivery (POD)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-agri-100 dark:bg-agri-950 text-agri-700 dark:text-agri-400 font-semibold">
                {shipment.shipment_number}
              </span>
            </h3>
            <p className="text-xs text-slate-500">Destination: {shipment.destination_name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {completedReceipt ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Delivery Completed & Receipt Issued!</h4>
              <p className="text-xs text-slate-500">
                Official Receipt Number: <strong className="font-mono text-agri-600 text-sm">{completedReceipt}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Commercial billing invoice has been automatically generated and order status moved to DELIVERED.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-agri-600 text-white font-semibold text-xs hover:bg-agri-700 shadow-md shadow-agri-600/20"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Receiver Full Name</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Delivered (KG)</label>
                  <input
                    type="number"
                    value={deliveredQtyKg}
                    onChange={e => setDeliveredQtyKg(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Damaged / Rejected (KG)</label>
                  <input
                    type="number"
                    value={damagedQtyKg}
                    onChange={e => setDamagedQtyKg(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Signature Canvas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <PenTool className="w-3.5 h-3.5 text-agri-600" />
                    <span>Customer Digital Signature (Sign on Dock)</span>
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
                <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 cursor-crosshair touch-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery Inspection Notes</label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={e => setDeliveryNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Recording POD...' : 'Confirm Delivery & Issue Receipt'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
