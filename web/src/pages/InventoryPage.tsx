import React, { useState, useEffect } from 'react';
import { Boxes, Warehouse, ArrowRightLeft, ShieldCheck, Thermometer, Plus, MapPin, Building2, Layers, Edit2, Trash2 } from 'lucide-react';
import { InventoryItem, Warehouse as WarehouseType } from '../types';
import { api } from '../services/api';
import { DataTable, Column } from '../components/DataTable';

export interface InventoryPageProps {
  initialTab?: 'inventory' | 'warehouses';
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ initialTab = 'inventory' }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'warehouses'>(initialTab);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stock intake form
  const [batches, setBatches] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [storageLocationId, setStorageLocationId] = useState('');
  const [quantityKg, setQuantityKg] = useState(2500);

  // New warehouse form
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whLat, setWhLat] = useState(37.8044);
  const [whLng, setWhLng] = useState(-122.2712);
  const [whSqft, setWhSqft] = useState(45000);
  const [whColdRooms, setWhColdRooms] = useState(6);

  // Edit warehouse form
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [isEditWarehouseOpen, setIsEditWarehouseOpen] = useState(false);
  const [editWhName, setEditWhName] = useState('');
  const [editWhCode, setEditWhCode] = useState('');
  const [editWhAddress, setEditWhAddress] = useState('');
  const [editWhLat, setEditWhLat] = useState(37.8044);
  const [editWhLng, setEditWhLng] = useState(-122.2712);
  const [editWhSqft, setEditWhSqft] = useState(45000);
  const [editWhColdRooms, setEditWhColdRooms] = useState(6);

  // Edit inventory form
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [isEditInventoryOpen, setIsEditInventoryOpen] = useState(false);
  const [editAvailQty, setEditAvailQty] = useState(0);
  const [editReservedQty, setEditReservedQty] = useState(0);
  const [editDamagedQty, setEditDamagedQty] = useState(0);
  const [editInvStatus, setEditInvStatus] = useState('AVAILABLE');
  const [editInvExpiry, setEditInvExpiry] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchInventoryData = async () => {
    setIsLoading(true);
    const [invRes, whRes, batRes, locRes] = await Promise.all([
      api.get<InventoryItem[]>(`/api/inventory${selectedWarehouseId ? `?warehouse_id=${selectedWarehouseId}` : ''}`),
      api.get<WarehouseType[]>('/api/warehouses'),
      api.get<any[]>('/api/batches'),
      api.get<any[]>('/api/warehouses/locations/all')
    ]);

    if (invRes.success && invRes.data) setInventory(invRes.data);
    if (whRes.success && whRes.data) {
      setWarehouses(whRes.data);
      if (whRes.data.length > 0 && !warehouseId) setWarehouseId(whRes.data[0].id);
    }
    if (batRes.success && batRes.data) {
      setBatches(batRes.data);
      if (batRes.data.length > 0 && !batchId) setBatchId(batRes.data[0].id);
    }
    if (locRes.success && locRes.data) {
      setLocations(locRes.data);
      if (locRes.data.length > 0 && !storageLocationId) setStorageLocationId(locRes.data[0].id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInventoryData();
  }, [selectedWarehouseId]);

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/inventory/receive', {
      batch_id: batchId,
      warehouse_id: warehouseId,
      storage_location_id: storageLocationId,
      quantity_kg: quantityKg
    });

    if (res.success) {
      setIsReceiveOpen(false);
      fetchInventoryData();
    } else {
      alert(res.error || 'Failed to receive inventory');
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/api/warehouses', {
      name: whName,
      code: whCode,
      address: whAddress,
      latitude: whLat,
      longitude: whLng,
      total_capacity_sqft: whSqft,
      total_cold_rooms: whColdRooms
    });

    if (res.success) {
      setIsWarehouseModalOpen(false);
      setWhName('');
      setWhCode('');
      setWhAddress('');
      fetchInventoryData();
    } else {
      alert(res.error || 'Failed to create warehouse');
    }
  };

  const openEditWarehouse = (w: WarehouseType) => {
    setEditingWarehouse(w);
    setEditWhName(w.name);
    setEditWhCode(w.code);
    setEditWhAddress(w.address || '');
    setEditWhLat(w.latitude || 37.8044);
    setEditWhLng(w.longitude || -122.2712);
    setEditWhSqft(w.total_capacity_sqft || 45000);
    setEditWhColdRooms(w.total_cold_rooms || 6);
    setIsEditWarehouseOpen(true);
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    const res = await api.put(`/api/warehouses/${editingWarehouse.id}`, {
      name: editWhName,
      code: editWhCode,
      address: editWhAddress,
      latitude: editWhLat,
      longitude: editWhLng,
      total_capacity_sqft: editWhSqft,
      total_cold_rooms: editWhColdRooms
    });
    if (res.success) {
      setIsEditWarehouseOpen(false);
      setEditingWarehouse(null);
      fetchInventoryData();
    } else {
      alert(res.error || 'Failed to update warehouse');
    }
  };

  const handleDeleteWarehouse = async (w: WarehouseType) => {
    if (!window.confirm(`Are you sure you want to delete warehouse "${w.name}"?`)) return;
    const res = await api.delete(`/api/warehouses/${w.id}`);
    if (res.success) {
      fetchInventoryData();
    } else {
      alert(res.error || 'Failed to delete warehouse');
    }
  };

  const openEditInventory = (item: InventoryItem) => {
    setEditingInventory(item);
    setEditAvailQty(item.available_qty_kg);
    setEditReservedQty(item.reserved_qty_kg);
    setEditDamagedQty(item.damaged_qty_kg || 0);
    setEditInvStatus(item.status);
    setEditInvExpiry(item.expiry_date || '');
    setIsEditInventoryOpen(true);
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventory) return;
    const res = await api.put(`/api/inventory/${editingInventory.id}`, {
      available_qty_kg: editAvailQty,
      reserved_qty_kg: editReservedQty,
      damaged_qty_kg: editDamagedQty,
      status: editInvStatus,
      expiry_date: editInvExpiry
    });
    if (res.success) {
      setIsEditInventoryOpen(false);
      setEditingInventory(null);
      fetchInventoryData();
    } else {
      alert(res.error || 'Failed to update inventory record');
    }
  };

  const handleDeleteInventory = async (item: InventoryItem) => {
    if (!window.confirm(`Scrap / Remove inventory record for "${item.product_name} (${item.batch_number})"?`)) return;
    const res = await api.delete(`/api/inventory/${item.id}`);
    if (res.success) {
      fetchInventoryData();
    } else {
      alert(res.error || 'Failed to delete inventory record');
    }
  };

  const inventoryColumns: Column<InventoryItem>[] = [
    {
      key: 'product_name',
      header: 'Product / Batch',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Boxes className="w-3.5 h-3.5 text-agri-600" />
            <span>{item.product_name}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 font-sans">{item.batch_number}</div>
        </div>
      )
    },
    {
      key: 'warehouse_name',
      header: 'Warehouse & Zone',
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{item.warehouse_name}</div>
          <div className="text-[11px] text-slate-400">{item.zone_name} • {item.rack} / {item.shelf}</div>
        </div>
      )
    },
    {
      key: 'available_qty_kg',
      header: 'Available Stock',
      render: (item) => (
        <span className="font-bold text-slate-900 dark:text-white">{(item.available_qty_kg ?? 0).toLocaleString()} KG</span>
      )
    },
    {
      key: 'reserved_qty_kg',
      header: 'Reserved / Picked',
      render: (item) => (
        <span className="text-slate-500 font-semibold">{(item.reserved_qty_kg ?? 0).toLocaleString()} KG</span>
      )
    },
    {
      key: 'expiry_date',
      header: 'FEFO Expiry',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
          {item.expiry_date}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Storage State',
      render: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {item.status}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => openEditInventory(item)}
            title="Edit Stock / Status"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteInventory(item)}
            title="Scrap / Remove Stock"
            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const warehouseColumns: Column<WarehouseType>[] = [
    {
      key: 'code',
      header: 'Code & Facility Name',
      render: (w) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Warehouse className="w-3.5 h-3.5 text-cold-600" />
            <span>{w.name}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">{w.code}</div>
        </div>
      )
    },
    {
      key: 'address',
      header: 'Physical Location',
      render: (w) => (
        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center space-x-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{w.address}</span>
        </div>
      )
    },
    {
      key: 'total_capacity_sqft',
      header: 'Total Surface Area',
      render: (w) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
          {(w.total_capacity_sqft ?? 0).toLocaleString()} sqft
        </span>
      )
    },
    {
      key: 'total_cold_rooms',
      header: 'Cold Rooms',
      render: (w) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cold-100 text-cold-800 dark:bg-cold-950 dark:text-cold-300">
          {w.total_cold_rooms} Chilled Chambers
        </span>
      )
    },
    {
      key: 'status',
      header: 'Hub Status',
      render: (w) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          OPERATIONAL
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (w) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => openEditWarehouse(w)}
            title="Edit Warehouse"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteWarehouse(w)}
            title="Delete Warehouse"
            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Warehouse Inventory & Cold Storage Hubs</h2>
          <p className="text-xs text-slate-500">FEFO batch expiration, multi-chamber chilled temperature zones, and automated stock intake.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'inventory' && (
            <>
              <select
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
                className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
              >
                <option value="">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              <button
                onClick={() => setIsReceiveOpen(true)}
                className="px-4 py-2 rounded-xl bg-agri-600 hover:bg-agri-700 text-white font-bold text-xs shadow-md shadow-agri-600/20 inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Intake Batch</span>
              </button>
            </>
          )}

          {activeTab === 'warehouses' && (
            <button
              onClick={() => setIsWarehouseModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cold-600 hover:bg-cold-700 text-white font-bold text-xs shadow-md shadow-cold-600/20 inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register Cold Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 ${
            activeTab === 'inventory'
              ? 'border-agri-600 text-agri-600 dark:text-agri-400 bg-agri-50/50 dark:bg-agri-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>FEFO Inventory ({inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warehouses')}
          className={`flex items-center space-x-2 py-2.5 px-4 font-semibold text-xs rounded-t-xl transition-colors border-b-2 ${
            activeTab === 'warehouses'
              ? 'border-cold-600 text-cold-600 dark:text-cold-400 bg-cold-50/50 dark:bg-cold-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Warehouses & Cold Hubs ({warehouses.length})</span>
        </button>
      </div>

      {/* Warehouse Occupancy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {warehouses.map(w => (
          <div key={w.id} className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{w.code}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {w.total_cold_rooms} Rooms
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{w.name}</h4>
            <div className="text-[11px] text-slate-400 truncate">{w.address}</div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px]">
              <span className="text-slate-400">Total Sqft:</span>
              <strong className="text-slate-800 dark:text-slate-200">{(w.total_capacity_sqft ?? 0).toLocaleString()} sqft</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Tab 1: Inventory Table */}
      {activeTab === 'inventory' && (
        <DataTable
          columns={inventoryColumns}
          data={inventory}
          title="Cold Storage Lots (Sorted by Expiry - FEFO)"
        />
      )}

      {/* Tab 2: Warehouses Table */}
      {activeTab === 'warehouses' && (
        <DataTable
          columns={warehouseColumns}
          data={warehouses}
          title="Distribution Centers & Regional Cold Chain Hubs"
        />
      )}

      {/* Intake Modal */}
      {isReceiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Warehouse Stock Intake</h3>
            <form onSubmit={handleReceiveStock} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Batch</label>
                <select
                  value={batchId}
                  onChange={e => setBatchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.batch_number} - {b.product_name} ({b.quantity_kg} KG)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Warehouse</label>
                <select
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Storage Location Slot</label>
                <select
                  value={storageLocationId}
                  onChange={e => setStorageLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.zone_name} • {l.rack} / {l.shelf} ({l.target_temp_c}°C)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Intake Quantity (KG)</label>
                <input
                  type="number"
                  value={quantityKg}
                  onChange={e => setQuantityKg(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReceiveOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-agri-600 hover:bg-agri-700 text-white font-bold rounded-xl shadow"
                >
                  Confirm Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Modal */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Regional Cold Hub</h3>
            <form onSubmit={handleCreateWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hub Facility Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pacific Northwest Cold Terminal"
                  value={whName}
                  onChange={e => setWhName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Facility Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PNW-HUB-01"
                  value={whCode}
                  onChange={e => setWhCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Physical Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Maritime Blvd, Oakland, CA"
                  value={whAddress}
                  onChange={e => setWhAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={whLat}
                    onChange={e => setWhLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={whLng}
                    onChange={e => setWhLng(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Surface Area (Sqft)</label>
                  <input
                    type="number"
                    required
                    value={whSqft}
                    onChange={e => setWhSqft(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cold Chambers</label>
                  <input
                    type="number"
                    required
                    value={whColdRooms}
                    onChange={e => setWhColdRooms(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cold-600 hover:bg-cold-700 text-white font-bold rounded-xl shadow"
                >
                  Create Cold Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Warehouse Modal */}
      {isEditWarehouseOpen && editingWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Cold Hub ({editingWarehouse.code})</h3>
            <form onSubmit={handleUpdateWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hub Facility Name</label>
                <input
                  type="text"
                  required
                  value={editWhName}
                  onChange={e => setEditWhName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Facility Code</label>
                <input
                  type="text"
                  required
                  value={editWhCode}
                  onChange={e => setEditWhCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Physical Address</label>
                <input
                  type="text"
                  required
                  value={editWhAddress}
                  onChange={e => setEditWhAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editWhLat}
                    onChange={e => setEditWhLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editWhLng}
                    onChange={e => setEditWhLng(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Surface Area (Sqft)</label>
                  <input
                    type="number"
                    required
                    value={editWhSqft}
                    onChange={e => setEditWhSqft(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cold Chambers</label>
                  <input
                    type="number"
                    required
                    value={editWhColdRooms}
                    onChange={e => setEditWhColdRooms(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditWarehouseOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cold-600 hover:bg-cold-700 text-white font-bold rounded-xl shadow"
                >
                  Update Cold Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Inventory Item Modal */}
      {isEditInventoryOpen && editingInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Stock Levels - {editingInventory.product_name}</h3>
            <form onSubmit={handleUpdateInventory} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Available (KG)</label>
                  <input
                    type="number"
                    required
                    value={editAvailQty}
                    onChange={e => setEditAvailQty(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reserved (KG)</label>
                  <input
                    type="number"
                    required
                    value={editReservedQty}
                    onChange={e => setEditReservedQty(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Damaged (KG)</label>
                  <input
                    type="number"
                    value={editDamagedQty}
                    onChange={e => setEditDamagedQty(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Storage State / Quality Status</label>
                <select
                  value={editInvStatus}
                  onChange={e => setEditInvStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="AVAILABLE">AVAILABLE (Normal Stock)</option>
                  <option value="RESERVED">RESERVED (Staged for Transit)</option>
                  <option value="EXPIRED">EXPIRED (Past FEFO Limit)</option>
                  <option value="DAMAGED">DAMAGED (Quarantined)</option>
                  <option value="QUARANTINED">QUARANTINED (QA Hold)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">FEFO Expiration Date</label>
                <input
                  type="date"
                  value={editInvExpiry}
                  onChange={e => setEditInvExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditInventoryOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-agri-600 hover:bg-agri-700 text-white font-bold rounded-xl shadow"
                >
                  Save Stock Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
