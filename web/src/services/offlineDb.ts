export interface OfflineAction {
  id: string;
  type: 'INSPECTION' | 'DELIVERY_POD' | 'GPS_POINT' | 'SHIPMENT_STATUS' | 'BATCH_STATUS';
  operation: 'CREATE' | 'UPDATE';
  payload: any;
  timestamp: string;
  retryCount: number;
}

const STORAGE_KEY = 'agrisupply_offline_sync_queue_v1';

export const offlineDb = {
  getQueue(): OfflineAction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addAction(type: OfflineAction['type'], operation: OfflineAction['operation'], payload: any): OfflineAction {
    const queue = this.getQueue();
    const action: OfflineAction = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      operation,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    queue.push(action);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return action;
  },

  removeAction(id: string): void {
    const queue = this.getQueue().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  },

  clearQueue(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  getQueueCount(): number {
    return this.getQueue().length;
  }
};
