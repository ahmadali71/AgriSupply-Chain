import React, { createContext, useContext, useState, useEffect } from 'react';
import { offlineDb, OfflineAction } from '../services/offlineDb';
import { api } from '../services/api';

interface OfflineContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<{ success: boolean; synced: number; conflicts: number }>;
  recordOfflineAction: (type: OfflineAction['type'], operation: OfflineAction['operation'], payload: any) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemOnline, setSystemOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(offlineDb.getQueueCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setSystemOnline(true);
    const handleOffline = () => setSystemOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOnline = systemOnline && !isSimulatedOffline;

  // Auto-sync when reconnecting to network
  useEffect(() => {
    if (effectiveOnline && pendingCount > 0) {
      syncNow();
    }
  }, [effectiveOnline]);

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline(prev => !prev);
  };

  const recordOfflineAction = (type: OfflineAction['type'], operation: OfflineAction['operation'], payload: any) => {
    offlineDb.addAction(type, operation, payload);
    setPendingCount(offlineDb.getQueueCount());
  };

  const syncNow = async () => {
    setIsSyncing(true);
    const result = await api.syncOfflineQueue();
    setPendingCount(offlineDb.getQueueCount());
    setIsSyncing(false);
    return {
      success: result.success,
      synced: result.syncedCount,
      conflicts: result.conflictCount
    };
  };

  return (
    <OfflineContext.Provider value={{
      isOnline: effectiveOnline,
      isSimulatedOffline,
      toggleSimulatedOffline,
      pendingCount,
      isSyncing,
      syncNow,
      recordOfflineAction
    }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) throw new Error('useOffline must be used within an OfflineProvider');
  return context;
};
