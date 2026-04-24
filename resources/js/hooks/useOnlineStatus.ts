import { useEffect, useState } from 'react';

export interface UseOnlineStatusReturn {
  isOnline: boolean;
  isOffline: boolean;
  status: 'online' | 'offline';
}

/**
 * Hook to detect online/offline status
 * Uses navigator.onLine and online/offline events
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOnlineStatus] Connection restored');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[useOnlineStatus] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    status: isOnline ? 'online' : 'offline',
  };
}

/**
 * Hook to listen for online status changes with callback
 */
export function useOnlineStatusChange(
  onStatusChange: (isOnline: boolean) => void
): UseOnlineStatusReturn {
  const status = useOnlineStatus();

  useEffect(() => {
    onStatusChange(status.isOnline);
  }, [status.isOnline, onStatusChange]);

  return status;
}

/**
 * Hook for device connection detection
 * Uses navigator.onLine events + periodic verification
 */
export function useConnectivityStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });

  useEffect(() => {
    let checkIntervalId: NodeJS.Timeout | null = null;

    const verifyConnectivity = async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch('/manifest.json', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        return false;
      }
    };

    const handleOnline = () => {
      console.log('[useConnectivityStatus] Online event fired');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[useConnectivityStatus] Offline event fired');
      setIsOnline(false);
    };

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check every 5 seconds to detect WiFi changes
    checkIntervalId = setInterval(async () => {
      const navigatorOnline = navigator.onLine;
      if (navigatorOnline && isOnline) {
        // Already online, no need to check
        return;
      }
      
      // Check actual connectivity if navigator says offline or we think we're offline
      const actuallyOnline = await verifyConnectivity();
      if (actuallyOnline !== isOnline) {
        console.log('[useConnectivityStatus] Status change detected:', actuallyOnline ? 'online' : 'offline');
        setIsOnline(actuallyOnline);
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (checkIntervalId) {
        clearInterval(checkIntervalId);
      }
    };
  }, [isOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    status: isOnline ? 'online' : 'offline',
  };
}
