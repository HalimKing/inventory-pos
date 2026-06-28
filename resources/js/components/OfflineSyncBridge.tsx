import { useSyncManager } from '@/lib/useSyncManager';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const OFFLINE_SYNC_ROLE_IDS = new Set([1, 2, 3]);

function OfflineSyncBridgeInner() {
    useSyncManager();
    return null;
}

export function OfflineSyncBridge() {
    const { auth } = usePage<SharedData>().props;
    const roleId = Number(auth.user?.role_id ?? 0);
    const canSyncOfflineSales = OFFLINE_SYNC_ROLE_IDS.has(roleId);

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
