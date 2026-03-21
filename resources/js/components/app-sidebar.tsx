import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    DollarSign,
    Folder,
    LayoutGrid,
    Settings,
    ShoppingCart,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

// cashier sidebar items
const cashierNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/cashier/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Sales',
        href: '/cashier/sales',
        icon: ShoppingCart,
    },
];

const inventoryNavItems: NavItem[] = [
    {
        title: 'Products',
        href: '/admin/products',
        icon: Folder,
    },
    {
        title: 'Categories',
        href: '/admin/categories',
        icon: Folder,
    },
    {
        title: 'Suppliers',
        href: '/admin/suppliers',
        icon: Users,
    },
];

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutGrid,
    },
    // sales
    {
        title: 'Sales',
        href: '/admin/sales',
        icon: ShoppingCart,
    },
    // products
    {
        title: 'Products',
        href: '/admin/products',
        icon: Folder,
    },
    // categories
    {
        title: 'Categories',
        href: '/admin/categories',
        icon: Folder,
    },
    // sales reports
    {
        title: 'Sales Reports',
        href: '/admin/sale-reports',
        icon: DollarSign,
    },
    // expenses
    // suppliers
    {
        title: 'Suppliers',
        href: '/admin/suppliers',
        icon: Users,
    },
    // users
    {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
    },
    // settings
    {
        title: 'Settings',
        href: '/admin/settings/index',
        icon: Settings,
    },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain
                    items={
                        auth.user.role_id === 3
                            ? cashierNavItems
                            : auth.user.role_id === 4
                              ? inventoryNavItems
                              : mainNavItems
                    }
                />
            </SidebarContent>

            <SidebarFooter>
                {/* <NavFooter items={footerNavItems} className="mt-auto" /> */}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
