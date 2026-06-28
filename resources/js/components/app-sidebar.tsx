import { SidebarBrand } from '@/components/sidebar/sidebar-brand';
import { SidebarFooterActions } from '@/components/sidebar/sidebar-footer-actions';
import { SidebarNavGroups } from '@/components/sidebar/sidebar-nav-groups';
import { SidebarUserProfile } from '@/components/sidebar/sidebar-user-profile';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { getSidebarNavGroups } from '@/config/sidebar-navigation';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const roleId = Number(auth.user.role_id ?? 0);
    const navGroups = getSidebarNavGroups(roleId);

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-white/10 bg-[#1E3A8A] text-white [&_[data-sidebar=sidebar]]:bg-[#1E3A8A]"
        >
            <SidebarHeader className="gap-3 p-3 pb-2">
                <SidebarBrand />
                <SidebarSeparator className="bg-white/10" />
                <SidebarUserProfile user={auth.user} />
            </SidebarHeader>

            <SidebarContent className="gap-0 scroll-smooth">
                <SidebarNavGroups groups={navGroups} />
            </SidebarContent>

            <SidebarFooter className="gap-0 p-0">
                <SidebarFooterActions />
            </SidebarFooter>
        </Sidebar>
    );
}
