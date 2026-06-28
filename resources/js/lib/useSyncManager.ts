<<<<<<< HEAD
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { offlineSyncManager, SyncResult } from './offlineSyncManager';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
=======
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { offlineSyncManager, SyncResult } from './offlineSyncManager';
import { useConnectivityStatus } from '@/hooks/useOnlineStatus';
>>>>>>> 67f5ce7 (updating the login and other pages UI)
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
<<<<<<< HEAD
  const { isOnline } = useOnlineStatus();

  // Perform sync operation
=======
  const { isOnline } = useConnectivityStatus();
  const prevOnlineRef = useRef<boolean | null>(null);

  const refreshUnsyncedCount = useCallback(async () => {
    await posDatabase.init();
    const count = await offlineSyncManager.getUnsyncedSalesCount();
    setUnsyncedCount(count);
  }, []);

>>>>>>> 67f5ce7 (updating the login and other pages UI)
  const performSync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    setLastError(null);

    try {
      const result = await offlineSyncManager.syncOfflineSales();
<<<<<<< HEAD
=======
      await refreshUnsyncedCount();
>>>>>>> 67f5ce7 (updating the login and other pages UI)
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
<<<<<<< HEAD
  }, []);

  // Trigger sync when coming back online
  useEffect(() => {
    if (isOnline && unsyncedCount > 0) {
      console.log('[useSyncManager] Online detected with', unsyncedCount, 'unsynced sales, triggering auto-sync');
      toast.info('🟢 Connection restored. Syncing offline sales...');
      performSync().then((result) => {
        if (result.success && result.syncedSales > 0) {
          toast.success(`✅ Auto-synced ${result.syncedSales} sale(s)`);
        }
      });
    }
  }, [isOnline, unsyncedCount, performSync]);

  // Update unsynced count periodically
  useEffect(() => {
    const updateUnsyncedCount = async () => {
      try {
        await posDatabase.init();
        const count = await offlineSyncManager.getUnsyncedSalesCount();
        setUnsyncedCount(count);
      } catch (error) {
        console.error('[useSyncManager] Error updating unsynced count:', error);
      }
    };

    updateUnsyncedCount();
    const interval = setInterval(updateUnsyncedCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen for sync events
  useEffect(() => {
    const unsubscribe = offlineSyncManager.onSync((result: SyncResult) => {
      setUnsyncedCount(0);

      if (result.success) {
        if (result.syncedSales > 0) {
          toast.success(
            `✅ Successfully synced ${result.syncedSales} sale(s)`
          );
        }
      } else {
        const errorMsg = result.errors[0]?.message || 'Sync failed';
        setLastError(errorMsg);
        toast.error(`❌ Sync error: ${errorMsg}`);
=======
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
>>>>>>> 67f5ce7 (updating the login and other pages UI)
      }
    });

    return unsubscribe;
<<<<<<< HEAD
  }, []);
=======
  }, [refreshUnsyncedCount]);
>>>>>>> 67f5ce7 (updating the login and other pages UI)

  return {
    isSyncing,
    lastError,
    unsyncedCount,
    manualSync: performSync,
  };
}
