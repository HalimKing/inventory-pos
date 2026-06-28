import { useEffect } from 'react';
import { registerUiLockWatchdog } from '@/lib/reset-ui-lock';

/**
 * Safety net for logged-in layouts — detects orphaned body locks
 * when no modal is visibly open.
 */
export function UiLockGuard() {
    useEffect(() => registerUiLockWatchdog(), []);

    return null;
}
