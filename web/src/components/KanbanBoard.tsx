import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, ArrowRight, Package, User, Clock, AlertCircle } from 'lucide-react';
import { Order } from '../types';
import { PIPELINE_STAGES } from '../config/constants';
import { api } from '../services/api';

interface KanbanBoardProps {
  orders: Order[];
  onOrderMoved: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ orders, onOrderMoved }) => {
  const [movingOrderId, setMovingOrderId] = useState<string | null>(null);

  const moveOrder = async (orderId: string, targetStage: string) => {
    setMovingOrderId(orderId);
    const res = await api.put<any>(`/api/orders/${orderId}/kanban`, { pipeline_stage: targetStage });
    setMovingOrderId(null);
    if (res.success) {
      onOrderMoved();
    }
  };

  const stageDisplayNames: Record<string, string> = {
    NEW: '1. New Order',
    QUALITY_CHECK: '2. Quality Check',
    APPROVED: '3. Approved',
    READY: '4. Ready for Transit',
    IN_TRANSIT: '5. In Transit',
    WAREHOUSE: '6. Warehouse Intake',
    PROCESSING: '7. Processing / Pack',
    DISPATCHED: '8. Out for Delivery',
    DELIVERED: '9. Delivered'
  };

  const stageBadgeColors: Record<string, string> = {
    NEW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    QUALITY_CHECK: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    READY: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    IN_TRANSIT: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    WAREHOUSE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    PROCESSING: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    DISPATCHED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex space-x-3.5 min-w-[1900px] items-start">
        {PIPELINE_STAGES.map((stageKey, colIdx) => {
          const stageOrders = orders.filter(o => o.pipeline_stage === stageKey);

          return (
            <div
              key={stageKey}
              className="w-72 flex-shrink-0 bg-slate-100/70 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[750px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  {stageDisplayNames[stageKey] || stageKey}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${stageBadgeColors[stageKey]}`}>
                  {stageOrders.length}
                </span>
              </div>

              {/* Cards Area */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {stageOrders.length > 0 ? (
                  stageOrders.map(order => {
                    const isMoving = movingOrderId === order.id;
                    const prevStage = colIdx > 0 ? PIPELINE_STAGES[colIdx - 1] : null;
                    const nextStage = colIdx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[colIdx + 1] : null;

                    return (
                      <div
                        key={order.id}
                        className={`bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all ${
                          isMoving ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {order.order_number}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            order.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' :
                            order.priority === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {order.priority}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-agri-700 dark:text-agri-400 mb-1">
                          {order.product_name}
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mb-2.5">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{order.retailer_name || 'Retailer'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Package className="w-3 h-3 text-slate-400" />
                            <span>{order.requested_qty_kg} KG • ${order.total_amount?.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Required: {order.required_delivery_date}</span>
                          </div>
                        </div>

                        {/* Move Pipeline Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          {prevStage ? (
                            <button
                              onClick={() => moveOrder(order.id, prevStage)}
                              title={`Move back to ${prevStage}`}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          ) : <div />}

                          {nextStage && (
                            <button
                              onClick={() => moveOrder(order.id, nextStage)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 text-white dark:bg-slate-700 hover:bg-agri-600 dark:hover:bg-agri-600 transition-colors shadow-xs"
                            >
                              <span>Advance</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-28 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    No orders in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
