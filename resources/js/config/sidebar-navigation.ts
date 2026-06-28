import { type NavGroup } from '@/types';
import {
    BarChart3,
    FolderTree,
    History,
    LayoutGrid,
    Package,
    ScrollText,
    ShoppingCart,
    Truck,
    Users,
} from 'lucide-react';

const cashierNavGroups: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            {
                title: 'Dashboard',
                href: '/cashier/dashboard',
                icon: LayoutGrid,
            },
        ],
    },
    {
        title: 'Point of Sale',
        items: [
            {
                title: 'Sales',
                href: '/cashier/sales',
                icon: ShoppingCart,
            },
            {
                title: 'Transaction History',
                href: '/cashier/transactions',
                icon: History,
            },
            {
                title: 'Reports',
                href: '/cashier/reports',
                icon: BarChart3,
            },
        ],
    },
];

const inventoryNavGroups: NavGroup[] = [
    {
        title: 'Inventory Management',
        items: [
            {
                title: 'Products',
                href: '/admin/products',
                icon: Package,
            },
            {
                title: 'Categories',
                href: '/admin/categories',
                icon: FolderTree,
            },
            {
                title: 'Suppliers',
                href: '/admin/suppliers',
                icon: Truck,
            },
        ],
    },
];

const adminNavGroups: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            {
                title: 'Dashboard',
                href: '/admin/dashboard',
                icon: LayoutGrid,
            },
        ],
    },
    {
        title: 'Operations',
        items: [
            {
                title: 'Sales',
                href: '/admin/sales',
                icon: ShoppingCart,
            },
        ],
    },
    {
        title: 'Inventory',
        items: [
            {
                title: 'Products',
                href: '/admin/products',
                icon: Package,
            },
            {
                title: 'Categories',
                href: '/admin/categories',
                icon: FolderTree,
            },
            {
                title: 'Suppliers',
                href: '/admin/suppliers',
                icon: Truck,
            },
        ],
    },
    {
        title: 'Reports & Analytics',
        items: [
            {
                title: 'Sales Reports',
                href: '/admin/sale-reports',
                icon: BarChart3,
            },
        ],
    },
    {
        title: 'Administration',
        items: [
            {
                title: 'Users',
                href: '/admin/users',
                icon: Users,
            },
            {
                title: 'System Logs',
                href: '/admin/system-logs',
                icon: ScrollText,
            },
        ],
    },
];

export function getSidebarNavGroups(roleId: number): NavGroup[] {
    if (roleId === 3) {
        return cashierNavGroups;
    }

    if (roleId === 4) {
        return inventoryNavGroups;
    }

    return adminNavGroups;
}
