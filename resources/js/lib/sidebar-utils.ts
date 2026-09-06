import { resolveUrl } from '@/lib/utils';
import { type User } from '@/types';

const ROLE_LABELS: Record<string, string> = {
    'supper admin': 'Super Administrator',
    admin: 'Administrator',
    cashier: 'Cashier',
    inventory: 'Inventory Manager',
};

const ROLE_ID_NAMES: Record<number, string> = {
    1: 'supper admin',
    2: 'admin',
    3: 'cashier',
    4: 'inventory',
};

export function resolveRoleName(user: User | null | undefined): string {
    const named = String(user?.role ?? '').toLowerCase().trim();

    if (named && ROLE_LABELS[named]) {
        return named;
    }

    return ROLE_ID_NAMES[Number(user?.role_id ?? 0)] ?? '';
}

export function getRoleLabel(user: User): string {
    const roleName = resolveRoleName(user);

    if (ROLE_LABELS[roleName]) {
        return ROLE_LABELS[roleName];
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

export function getSettingsHref(user: User): string {
    const role = resolveRoleName(user);

    if (role === 'supper admin' || role === 'admin') {
        return '/admin/settings/index';
    }

    return '/settings/profile';
}

export function getDashboardHref(user: User): string {
    const role = resolveRoleName(user);

    if (role === 'cashier') {
        return '/cashier/dashboard';
    }

    if (role === 'inventory') {
        return '/admin/products';
    }

    return '/admin/dashboard';
}
