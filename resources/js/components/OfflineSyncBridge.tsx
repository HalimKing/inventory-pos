import { useSyncManager } from '@/lib/useSyncManager';
import { resolveRoleName } from '@/lib/sidebar-utils';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const OFFLINE_SYNC_ROLES = new Set(['supper admin', 'admin', 'cashier']);

function OfflineSyncBridgeInner() {
    useSyncManager();
    return null;
}

export function OfflineSyncBridge() {
    const { auth } = usePage<SharedData>().props;
    const canSyncOfflineSales = OFFLINE_SYNC_ROLES.has(resolveRoleName(auth.user));

    if (!canSyncOfflineSales) {
        return null;
    }

    return (
        <>
            <OfflineSyncBridgeInner />
            <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                transition={Bounce}
            />
        </>
    );
}
