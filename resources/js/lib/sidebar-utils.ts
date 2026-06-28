import { resolveUrl } from '@/lib/utils';
import { type User } from '@/types';

const ROLE_LABELS: Record<number, string> = {
    1: 'Super Administrator',
    2: 'Administrator',
    3: 'Cashier',
    4: 'Inventory Manager',
};

export function getRoleLabel(user: User): string {
    const roleId = Number(user.role_id);

    if (ROLE_LABELS[roleId]) {
        return ROLE_LABELS[roleId];
    }

    if (user.role) {
        return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    }

    return 'Staff';
}

export function isNavItemActive(
    currentUrl: string,
    href: Parameters<typeof resolveUrl>[0],
): boolean {
    const target = resolveUrl(href);

    return currentUrl === target || currentUrl.startsWith(`${target}/`);
}

export function getSettingsHref(roleId: number): string {
    if (roleId === 1 || roleId === 2) {
        return '/admin/settings/index';
    }

    return '/settings/profile';
}

export function getDashboardHref(roleId: number): string {
    if (roleId === 3) {
        return '/cashier/dashboard';
    }

    if (roleId === 4) {
        return '/admin/products';
    }

    return '/admin/dashboard';
}
