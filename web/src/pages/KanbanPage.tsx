import React, { useState, useEffect } from 'react';
import { Boxes, Plus, RefreshCw, ShoppingCart, FileCheck, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
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

  // Create Order state
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [newRetailer, setNewRetailer] = useState('Whole Foods Market - Bay Area');
  const [newProduct, setNewProduct] = useState('Organic Strawberries Grade A');
  const [newQty, setNewQty] = useState(2500);
  const [newPrice, setNewPrice] = useState(4.5);
  const [newAddress, setNewAddress] = useState('399 4th St, San Francisco, CA');
  const [newDeliveryDate, setNewDeliveryDate] = useState('2026-10-15');
  const [newPriority, setNewPriority] = useState('HIGH');

  // Edit Order state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editQty, setEditQty] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editAddress, setEditAddress] = useState('');
  const [editPriority, setEditPriority] = useState('NORMAL');
  const [editStatus, setEditStatus] = useState('PENDING');
  const [editStage, setEditStage] = useState('PENDING');

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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/orders', {
      retailer_id: 'ret-01',
      retailer_name: newRetailer,
      product_name: newProduct,
      requested_qty_kg: newQty,
      unit_price: newPrice,
      delivery_address: newAddress,
      required_delivery_date: newDeliveryDate,
      priority: newPriority
    });

    if (res.success) {
      setIsCreateOrderOpen(false);
      fetchData();
    } else {
      alert(res.error || 'Failed to create order');
    }
  };

  const openEditOrder = (o: Order) => {
    setEditingOrder(o);
    setEditQty(o.requested_qty_kg);
    setEditPrice(o.unit_price);
    setEditAddress(o.delivery_address || '');
    setEditPriority(o.priority || 'NORMAL');
    setEditStatus(o.status || 'PENDING');
    setEditStage(o.pipeline_stage || 'PENDING');
    setIsEditOrderOpen(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    const res = await api.put(`/api/orders/${editingOrder.id}`, {
      requested_qty_kg: editQty,
      unit_price: editPrice,
      delivery_address: editAddress,
      priority: editPriority,
      status: editStatus,
      pipeline_stage: editStage
    });

    if (res.success) {
      setIsEditOrderOpen(false);
      setEditingOrder(null);
      fetchData();
    } else {
      alert(res.error || 'Failed to update order');
    }
  };

  const handleDeleteOrder = async (o: Order) => {
    if (!window.confirm(`Are you sure you want to delete purchase order "${o.order_number}"?`)) return;
    const res = await api.delete(`/api/orders/${o.id}`);
    if (res.success) {
      fetchData();
    } else {
      alert(res.error || 'Failed to delete order');
    }
  };

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
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (o) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => openEditOrder(o)}
            title="Edit Order"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteOrder(o)}
            title="Delete Order"
            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Retail Purchase Orders</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCreateOrderOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Purchase Order</span>
              </button>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
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

      {/* Create Order Modal */}
      {isCreateOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Retail Purchase Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Retailer / Buyer</label>
                <input
                  type="text"
                  required
                  value={newRetailer}
                  onChange={e => setNewRetailer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Produce Cargo</label>
                <input
                  type="text"
                  required
                  value={newProduct}
                  onChange={e => setNewProduct(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity (KG)</label>
                  <input
                    type="number"
                    required
                    value={newQty}
                    onChange={e => setNewQty(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Price ($/KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPrice}
                    onChange={e => setNewPrice(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery Destination Address</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Required Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={newDeliveryDate}
                    onChange={e => setNewDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Order Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOrderOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditOrderOpen && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Purchase Order ({editingOrder.order_number})</h3>
            <form onSubmit={handleUpdateOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity (KG)</label>
                  <input
                    type="number"
                    required
                    value={editQty}
                    onChange={e => setEditQty(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Price ($/KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={e => setEditPrice(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="FULFILLED">FULFILLED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pipeline Stage</label>
                  <select
                    value={editStage}
                    onChange={e => setEditStage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="STAGED">STAGED</option>
                    <option value="PICKED">PICKED</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOrderOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow"
                >
                  Update Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
