import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { offlineSyncManager, SyncResult } from './offlineSyncManager';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
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
  const { isOnline } = useOnlineStatus();

  // Perform sync operation
  const performSync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    setLastError(null);

    try {
      const result = await offlineSyncManager.syncOfflineSales();
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
      }
    });

    return unsubscribe;
  }, []);

  return {
    isSyncing,
    lastError,
    unsyncedCount,
    manualSync: performSync,
  };
}
