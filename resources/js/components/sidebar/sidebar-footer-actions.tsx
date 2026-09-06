import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { resetUiLock } from '@/lib/reset-ui-lock';
import { getSettingsHref, isNavItemActive } from '@/lib/sidebar-utils';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { type Company, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { CircleHelp, LogOut, Settings } from 'lucide-react';
import { memo } from 'react';

export const SidebarFooterActions = memo(function SidebarFooterActions() {
    const { auth, company } = usePage<
        SharedData & { company?: Company | null }
    >().props;
    const { isMobile, setOpenMobile } = useSidebar();
    const settingsHref = getSettingsHref(auth.user);
    const supportEmail =
        (company as Company | null)?.email ?? 'support@mallpos.com';
    const helpHref = `mailto:${supportEmail}?subject=Mall%20POS%20Support`;

    const handleNavigate = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
        resetUiLock();
    };

    const handleLogout = () => {
        handleNavigate();
        router.flushAll();
    };

    const linkClass = cn(
        'h-10 rounded-lg text-blue-50/90 transition-all duration-200',
        'hover:bg-white/10 hover:text-white',
        'focus-visible:ring-[#FBBF24]/40',
        'data-[active=true]:border-l-[3px] data-[active=true]:border-[#FBBF24] data-[active=true]:bg-white/15 data-[active=true]:font-semibold data-[active=true]:text-white',
    );

    const page = usePage();

    return (
        <SidebarGroup className="mt-auto border-t border-white/10 px-2 pt-3 pb-2">
            <SidebarGroupContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={isNavItemActive(page.url, settingsHref)}
                            tooltip={{ children: 'Settings' }}
                            className={linkClass}
                        >
                            <Link
                                href={settingsHref}
                                prefetch
                                onClick={handleNavigate}
                            >
                                <Settings className="size-[18px] text-blue-200/70" />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: 'Help & Support' }}
                            className={linkClass}
                        >
                            <a
                                href={helpHref}
                                onClick={handleNavigate}
                            >
                                <CircleHelp className="size-[18px] text-blue-200/70" />
                                <span>Help & Support</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: 'Log out' }}
                            className={cn(
                                linkClass,
                                'hover:bg-[#DC2626]/20 hover:text-white',
                            )}
                        >
                            <Link
                                href={logout()}
                                method="post"
                                as="button"
                                onClick={handleLogout}
                                data-test="sidebar-logout-button"
                            >
                                <LogOut className="size-[18px] text-blue-200/70" />
                                <span>Log out</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
});
