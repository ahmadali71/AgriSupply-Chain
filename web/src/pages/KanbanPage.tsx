import React, { useState, useEffect } from 'react';
import { Boxes, Plus, RefreshCw, ShoppingCart, FileCheck, CheckCircle2 } from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';
import { KanbanBoard } from '../components/KanbanBoard';
import { DataTable, Column } from '../components/DataTable';

interface KanbanPageProps {
  initialTab?: 'kanban' | 'orders' | 'deliveries';
}

export const KanbanPage: React.FC<KanbanPageProps> = ({ initialTab = 'kanban' }) => {
  const [tab, setTab] = useState<'kanban' | 'orders' | 'deliveries'>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const fetchData = async () => {
    setIsLoading(true);
    const [ordRes, delRes] = await Promise.all([
      api.get<Order[]>('/api/orders'),
      api.get<any[]>('/api/deliveries')
    ]);

    if (ordRes.success && ordRes.data) setOrders(ordRes.data);
    if (delRes.success && delRes.data) setDeliveries(delRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const orderColumns: Column<Order>[] = [
    {
      key: 'order_number',
      header: 'Order #',
      render: (o) => (
        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
          <ShoppingCart className="w-3.5 h-3.5 text-indigo-500" />
          <span>{o.order_number}</span>
        </div>
      )
    },
    {
      key: 'retailer',
      header: 'Retailer / Buyer',
      render: (o) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{o.retailer_name}</div>
          <div className="text-[11px] text-slate-400">{o.delivery_address}</div>
        </div>
      )
    },
    {
      key: 'product',
      header: 'Produce Cargo',
      render: (o) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">{o.product_name}</div>
          <div className="text-[11px] text-slate-400">{o.requested_qty_kg} kg @ ${o.unit_price}/kg</div>
        </div>
      )
    },
    {
      key: 'total',
      header: 'Total Value',
      render: (o) => <span className="font-mono font-bold text-emerald-600">${(o.total_amount ?? 0).toLocaleString()}</span>
    },
    {
      key: 'stage',
      header: 'Pipeline Stage',
      render: (o) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          {o.pipeline_stage || o.status}
        </span>
      )
    },
    {
      key: 'date',
      header: 'Required Delivery',
      render: (o) => <span className="text-xs text-slate-500">{o.required_delivery_date}</span>
    }
  ];

  const deliveryColumns: Column<any>[] = [
    {
      key: 'receipt_number',
      header: 'Receipt # (POD)',
      render: (d) => (
        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{d.receipt_number}</span>
        </div>
      )
    },
    {
      key: 'receiver',
      header: 'Receiver / Dock Mgr',
      render: (d) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{d.receiver_name}</div>
          <div className="text-[11px] text-slate-400">{d.delivery_notes || 'Confirmed cold intake'}</div>
        </div>
      )
    },
    {
      key: 'quantity',
      header: 'Delivered / Damaged',
      render: (d) => (
        <div>
          <span className="font-mono font-bold text-emerald-600">{d.delivered_qty_kg} kg</span>
          {d.damaged_qty_kg > 0 ? (
            <span className="ml-2 font-mono text-xs text-rose-500">({d.damaged_qty_kg} kg loss)</span>
          ) : (
            <span className="ml-2 text-[10px] text-slate-400 font-semibold">(0 loss)</span>
          )}
        </div>
      )
    },
    {
      key: 'signature',
      header: 'Dock Signature',
      render: (d) => (
        <div className="flex items-center space-x-1 text-emerald-600 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Digitally Signed</span>
        </div>
      )
    },
    {
      key: 'timestamp',
      header: 'Completion Time',
      render: (d) => <span className="text-xs text-slate-500">{d.timestamp ? new Date(d.timestamp).toLocaleString() : 'N/A'}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-indigo-500" />
            <span>Retail Orders & Fulfillment Pipeline</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time supply chain pipeline, retailer purchase orders, and digital proof-of-delivery tracking.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('kanban')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Kanban Board
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'orders'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Retailer Orders ({orders.length})
          </button>
          <button
            onClick={() => setTab('deliveries')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'deliveries'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Proof of Delivery ({deliveries.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {tab === 'kanban' && (
        <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
          <KanbanBoard orders={orders} onOrderMoved={fetchData} />
        </div>
      )}

      {tab === 'orders' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Retail Purchase Orders</h3>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
          <DataTable data={orders} columns={orderColumns} searchPlaceholder="Search orders, retailers, cargo..." />
        </div>
      )}

      {tab === 'deliveries' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Digital Proof of Delivery (POD) Records</h3>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
          <DataTable data={deliveries} columns={deliveryColumns} searchPlaceholder="Search receipts, receivers, notes..." />
        </div>
      )}
    </div>
  );
};
