/**
 * Clears scroll-lock and pointer-event blocks left on body/html by Radix Dialog/Sheet,
 * SweetAlert2, or react-remove-scroll. Does NOT remove portal DOM nodes — that causes
 * React removeChild errors during Inertia navigation.
 */
export function hasVisibleBlockingOverlay(): boolean {
    return (
        document.querySelector(
            [
                '[data-state="open"][data-slot="dialog-overlay"]',
                '[data-state="open"][data-slot="sheet-overlay"]',
                '[data-state="open"][data-radix-dialog-overlay]',
                '.swal2-container.swal2-shown',
            ].join(','),
        ) !== null
    );
}

export function resetUiLock(): void {
    const body = document.body;
    const html = document.documentElement;

    body.style.removeProperty('pointer-events');
    body.style.removeProperty('overflow');
    body.style.removeProperty('padding-right');
    body.style.removeProperty('margin-right');
    html.style.removeProperty('overflow');
    html.style.removeProperty('padding-right');
    html.style.removeProperty('margin-right');

    body.removeAttribute('data-scroll-locked');
    html.removeAttribute('data-scroll-locked');

    body.classList.remove('swal2-shown', 'swal2-height-auto', 'swal2-no-backdrop');
}

export function registerUiLockRecovery(): () => void {
    const recover = () => {
        // Run after React finishes unmounting the previous page.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resetUiLock());
        });
    };

    document.addEventListener('inertia:finish', recover);
    document.addEventListener('inertia:error', recover);

    return () => {
        document.removeEventListener('inertia:finish', recover);
        document.removeEventListener('inertia:error', recover);
    };
}

export function registerUiLockWatchdog(): () => void {
    const intervalId = window.setInterval(() => {
        const bodyLocked =
            document.body.style.pointerEvents === 'none' ||
            document.body.hasAttribute('data-scroll-locked');

        if (bodyLocked && !hasVisibleBlockingOverlay()) {
            resetUiLock();
        }
    }, 2000);

    return () => window.clearInterval(intervalId);
}
