import { useCallback } from 'react';
import { resetUiLock } from '@/lib/reset-ui-lock';

export function useMobileNavigation() {
    return useCallback(() => {
        resetUiLock();
    }, []);
}
