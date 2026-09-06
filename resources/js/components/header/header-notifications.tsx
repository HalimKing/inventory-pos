import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHeaderNotifications } from '@/hooks/use-header-notifications';
import { resolveRoleName } from '@/lib/sidebar-utils';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Bell,
    CheckCircle2,
    Info,
    Trash2,
} from 'lucide-react';

function formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
        return 'Just now';
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    return new Date(timestamp).toLocaleDateString();
}

export function HeaderNotifications() {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
    } = useHeaderNotifications();
    const { auth } = usePage<SharedData>().props;
    const role = resolveRoleName(auth.user);

    const activityLink =
        role === 'cashier'
            ? { href: '/cashier/transactions', label: 'View transactions' }
            : role === 'inventory'
              ? { href: '/admin/products', label: 'View inventory' }
              : { href: '/admin/system-logs', label: 'View system activity' };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-10 rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm hover:bg-slate-50 hover:text-[#1E3A8A] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-[#FBBF24]"
                    aria-label={
                        unreadCount > 0
                            ? `${unreadCount} unread notifications`
                            : 'Notifications'
                    }
                >
                    <Bell className="size-[18px]" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#DC2626] text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[min(100vw-2rem,360px)] rounded-xl p-0"
            >
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold">Notifications</p>
                        <p className="text-xs text-muted-foreground">
                            {unreadCount > 0
                                ? `${unreadCount} unread`
                                : 'All caught up'}
                        </p>
                    </div>
                    {notifications.length > 0 && (
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={markAllAsRead}
                            >
                                Mark read
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground"
                                onClick={clearAll}
                                aria-label="Clear all notifications"
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                <ScrollArea className="max-h-80">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <Bell className="size-5 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium">
                                No notifications
                            </p>
                            <p className="text-xs text-muted-foreground">
                                System alerts and activity updates will appear
                                here.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {notifications.map((notification) => {
                                const Icon =
                                    notification.type === 'success'
                                        ? CheckCircle2
                                        : notification.type === 'error'
                                          ? AlertCircle
                                          : Info;

                                return (
                                    <li key={notification.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                markAsRead(notification.id)
                                            }
                                            className={cn(
                                                'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                                                !notification.read &&
                                                    'bg-[#1E3A8A]/5 dark:bg-[#1E3A8A]/10',
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    'mt-0.5 size-4 shrink-0',
                                                    notification.type ===
                                                        'success' &&
                                                        'text-emerald-600',
                                                    notification.type ===
                                                        'error' &&
                                                        'text-[#DC2626]',
                                                    notification.type ===
                                                        'info' &&
                                                        'text-[#1E3A8A]',
                                                )}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm leading-snug">
                                                    {notification.message}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatTime(
                                                        notification.createdAt,
                                                    )}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <span className="mt-2 size-2 shrink-0 rounded-full bg-[#DC2626]" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </ScrollArea>

                <div className="border-t px-4 py-2">
                    <Link
                        href={activityLink.href}
                        className="block rounded-lg py-2 text-center text-xs font-medium text-[#1E3A8A] hover:bg-slate-50 dark:text-[#FBBF24] dark:hover:bg-slate-800/50"
                    >
                        {activityLink.label}
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
