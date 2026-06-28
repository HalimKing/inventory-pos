import { type FlashMessages } from '@/types';
import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

export interface HeaderNotification {
    id: string;
    message: string;
    type: NotificationType;
    read: boolean;
    createdAt: number;
}

const STORAGE_KEY = 'pos-header-notifications';
const MAX_NOTIFICATIONS = 20;

function loadNotifications(): HeaderNotification[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored ? (JSON.parse(stored) as HeaderNotification[]) : [];
    } catch {
        return [];
    }
}

function saveNotifications(notifications: HeaderNotification[]) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function useHeaderNotifications() {
    const { flash } = usePage<{ flash?: FlashMessages }>().props;
    const [notifications, setNotifications] =
        useState<HeaderNotification[]>(loadNotifications);

    const persist = useCallback((next: HeaderNotification[]) => {
        setNotifications(next);
        saveNotifications(next);
    }, []);

    useEffect(() => {
        const incoming: HeaderNotification[] = [];

        if (flash?.success) {
            incoming.push({
                id: `success-${Date.now()}`,
                message: flash.success,
                type: 'success',
                read: false,
                createdAt: Date.now(),
            });
        }

        if (flash?.error) {
            incoming.push({
                id: `error-${Date.now()}`,
                message: flash.error,
                type: 'error',
                read: false,
                createdAt: Date.now(),
            });
        }

        if (incoming.length === 0) {
            return;
        }

        setNotifications((current) => {
            const merged = [...incoming, ...current]
                .filter(
                    (item, index, arr) =>
                        arr.findIndex((n) => n.id === item.id) === index,
                )
                .slice(0, MAX_NOTIFICATIONS);

            saveNotifications(merged);
            return merged;
        });
    }, [flash?.success, flash?.error]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = useCallback(
        (id: string) => {
            persist(
                notifications.map((n) =>
                    n.id === id ? { ...n, read: true } : n,
                ),
            );
        },
        [notifications, persist],
    );

    const markAllAsRead = useCallback(() => {
        persist(notifications.map((n) => ({ ...n, read: true })));
    }, [notifications, persist]);

    const clearAll = useCallback(() => {
        persist([]);
    }, [persist]);

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
    };
}
