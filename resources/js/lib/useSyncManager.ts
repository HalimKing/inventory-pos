import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { offlineSyncManager, SyncResult } from './offlineSyncManager';
import { useConnectivityStatus } from '@/hooks/useOnlineStatus';
import { posDatabase } from './database';

export interface UseSyncManagerReturn {
  isSyncing: boolean;
  lastError: string | null;
  unsyncedCount: number;
  manualSync: () => Promise<SyncResult>;
}

/**
 * Hook to manage offline sync with automatic sync on connection restore
 */
export function useSyncManager(): UseSyncManagerReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const { isOnline } = useConnectivityStatus();
  const prevOnlineRef = useRef<boolean | null>(null);

  const refreshUnsyncedCount = useCallback(async () => {
    await posDatabase.init();
    const count = await offlineSyncManager.getUnsyncedSalesCount();
    setUnsyncedCount(count);
  }, []);

  const performSync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    setLastError(null);

    try {
      const result = await offlineSyncManager.syncOfflineSales();
      await refreshUnsyncedCount();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      return {
        success: false,
        totalSales: 0,
        syncedSales: 0,
        failedSales: 0,
        errors: [
          {
            saleId: '',
            message: errorMessage,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } finally {
      setIsSyncing(false);
    }
  }, [refreshUnsyncedCount]);

  useEffect(() => {
    refreshUnsyncedCount();
    const interval = setInterval(refreshUnsyncedCount, 5000);
    return () => clearInterval(interval);
  }, [refreshUnsyncedCount]);

  useEffect(() => {
    if (!isOnline) {
      prevOnlineRef.current = false;
      return;
    }

    if (unsyncedCount <= 0) {
      return;
    }

    const prevOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    const cameOnline = prevOnline === false;
    const pendingOnInitialLoad = prevOnline === null;

    if (!cameOnline && !pendingOnInitialLoad) {
      return;
    }

    console.log(
      '[useSyncManager] Triggering auto-sync for',
      unsyncedCount,
      'offline sale(s)',
    );
    toast.info('Connection restored. Syncing offline sales...');
    void performSync();
  }, [isOnline, unsyncedCount, performSync]);

  useEffect(() => {
    const unsubscribe = offlineSyncManager.onSync((result: SyncResult) => {
      void refreshUnsyncedCount();

      if (result.success && result.syncedSales > 0) {
        toast.success(`Successfully synced ${result.syncedSales} sale(s)`);
        return;
      }

      if (!result.success) {
        const errorMsg = result.errors[0]?.message || 'Sync failed';
        setLastError(errorMsg);
        toast.error(`Sync error: ${errorMsg}`);
      }
    });

    return unsubscribe;
  }, [refreshUnsyncedCount]);

  return {
    isSyncing,
    lastError,
    unsyncedCount,
    manualSync: performSync,
  };
}
