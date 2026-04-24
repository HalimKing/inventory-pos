'use client';

import { useConnectivityStatus } from '@/hooks/useOnlineStatus';
import { offlineSyncManager } from '@/lib/offlineSyncManager';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineModeIndicator() {
    const { isOnline, isOffline } = useConnectivityStatus();
    const [unsyncedSalesCount, setUnsyncedSalesCount] = useState(0);

    useEffect(() => {
        const updateUnsyncedCount = async () => {
            try {
                const count = await offlineSyncManager.getUnsyncedSalesCount();
                setUnsyncedSalesCount(count);
            } catch (error) {
                console.error(
                    '[OfflineModeIndicator] Error updating count:',
                    error,
                );
            }
        };

        updateUnsyncedCount();
        const interval = setInterval(updateUnsyncedCount, 2000); // Check every 2 seconds

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const unsubscribe = offlineSyncManager.onSync((result) => {
            if (result.success) {
                setUnsyncedSalesCount(
                    Math.max(0, unsyncedSalesCount - result.syncedSales),
                );
            }
        });

        return unsubscribe;
    }, [unsyncedSalesCount]);

    // Always show offline if isOffline is true
    if (isOffline) {
        return (
            <div className="flex animate-pulse items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                <WifiOff className="h-4 w-4" />
                <span>🔴 Offline Mode</span>
            </div>
        );
    }

    if (isOnline && unsyncedSalesCount === 0) {
        return (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                <Wifi className="h-4 w-4" />
                <span>🟢 Online</span>
            </div>
        );
    }

    if (unsyncedSalesCount > 0) {
        return (
            <div className="flex animate-pulse items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700">
                <AlertCircle className="h-4 w-4" />
                <span>
                    ⚠️ {unsyncedSalesCount} sale
                    {unsyncedSalesCount !== 1 ? 's' : ''} pending sync
                </span>
            </div>
        );
    }

    return null;
}

export function OfflineNotificationBanner() {
    const { isOffline } = useConnectivityStatus();
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if (isOffline) {
            setShowBanner(true);
        }
    }, [isOffline]);

    if (!showBanner || !isOffline) {
        return null;
    }

    return (
        <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-red-500 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center gap-3">
                <WifiOff className="h-5 w-5 animate-pulse" />
                <div>
                    <p className="font-semibold">You are currently offline</p>
                    <p className="text-sm opacity-90">
                        Sales will be saved locally and synced when connection
                        is restored.
                    </p>
                </div>
            </div>
            <button
                onClick={() => setShowBanner(false)}
                className="text-xl font-bold hover:opacity-80"
            >
                ✕
            </button>
        </div>
    );
}

export function OfflineStatusPanel() {
    const { isOnline, isOffline } = useConnectivityStatus();
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const updateStatus = async () => {
            try {
                const count = await offlineSyncManager.getUnsyncedSalesCount();
                setUnsyncedCount(count);
            } catch (error) {
                console.error('[OfflineStatusPanel] Error:', error);
            }
        };

        updateStatus();
        const interval = setInterval(updateStatus, 2000); // Check every 2 seconds

        return () => clearInterval(interval);
    }, []);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            const result = await offlineSyncManager.syncOfflineSales();
            console.log('Sync completed:', result);
        } catch (error) {
            console.error('[OfflineStatusPanel] Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">
                        Connection Status
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                        {isOnline ? (
                            <>
                                <Wifi className="h-5 w-5 text-green-600" />
                                <span className="text-sm text-green-600">
                                    🟢 Online
                                </span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-5 w-5 animate-pulse text-red-600" />
                                <span className="text-sm text-red-600">
                                    🔴 Offline
                                </span>
                            </>
                        )}
                    </div>
                </div>
                {isOffline && unsyncedCount > 0 && (
                    <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                )}
            </div>
            {unsyncedCount > 0 && (
                <p className="mt-3 text-sm text-yellow-700">
                    ⚠️ {unsyncedCount} sale{unsyncedCount !== 1 ? 's' : ''}{' '}
                    pending synchronization
                </p>
            )}
        </div>
    );
}
