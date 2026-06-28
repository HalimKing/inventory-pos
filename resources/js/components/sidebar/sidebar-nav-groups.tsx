import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { resetUiLock } from '@/lib/reset-ui-lock';
import { isNavItemActive } from '@/lib/sidebar-utils';
import { cn } from '@/lib/utils';
import { type NavGroup } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

interface SidebarNavGroupsProps {
    groups: NavGroup[];
}

function NavGroupSection({ group }: { group: NavGroup }) {
    const page = usePage();
    const { isMobile, setOpenMobile } = useSidebar();
    const hasActiveChild = group.items.some((item) =>
        isNavItemActive(page.url, item.href),
    );
    const isSingleItem = group.items.length === 1;
    const [open, setOpen] = useState(hasActiveChild || isSingleItem);

    useEffect(() => {
        if (hasActiveChild) {
            setOpen(true);
        }
    }, [hasActiveChild, page.url]);

    const handleNavigate = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
        resetUiLock();
    };

    const menuItems = (
        <SidebarMenu>
            {group.items.map((item) => {
                const active = isNavItemActive(page.url, item.href);

                return (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={{ children: item.title }}
                            className={cn(
                                'h-10 rounded-lg text-blue-50/90 transition-all duration-200',
                                'hover:bg-white/10 hover:text-white',
                                'focus-visible:ring-[#FBBF24]/40',
                                'data-[active=true]:border-l-[3px] data-[active=true]:border-[#FBBF24] data-[active=true]:bg-white/15 data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:shadow-sm',
                            )}
                        >
                            <Link
                                href={item.href}
                                prefetch
                                onClick={handleNavigate}
                                aria-current={active ? 'page' : undefined}
                            >
                                {item.icon && (
                                    <item.icon
                                        className={cn(
                                            'size-[18px] shrink-0',
                                            active
                                                ? 'text-[#FBBF24]'
                                                : 'text-blue-200/70',
                                        )}
                                        aria-hidden
                                    />
                                )}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                        {item.badge !== undefined && (
                            <SidebarMenuBadge className="bg-[#DC2626] text-white">
                                {item.badge}
                            </SidebarMenuBadge>
                        )}
                    </SidebarMenuItem>
                );
            })}
        </SidebarMenu>
    );

    if (isSingleItem) {
        return (
            <SidebarGroup className="px-2 py-0">
                <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-blue-200/50 uppercase">
                    {group.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>{menuItems}</SidebarGroupContent>
            </SidebarGroup>
        );
    }

    return (
        <Collapsible
            open={open}
            onOpenChange={setOpen}
            className="group/collapsible"
        >
            <SidebarGroup className="px-2 py-0">
                <CollapsibleTrigger asChild>
                    <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#FBBF24]/40 focus-visible:outline-none"
                        aria-expanded={open}
                    >
                        <SidebarGroupLabel className="pointer-events-none h-auto p-0 text-[11px] font-semibold tracking-wider text-blue-200/50 uppercase">
                            {group.title}
                        </SidebarGroupLabel>
                        <ChevronRight
                            className={cn(
                                'size-4 shrink-0 text-blue-200/50 transition-transform duration-200',
                                open && 'rotate-90',
                            )}
                            aria-hidden
                        />
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden transition-all duration-200 ease-in-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                    <SidebarGroupContent className="pt-1">
                        {menuItems}
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}

export const SidebarNavGroups = memo(function SidebarNavGroups({
    groups,
}: SidebarNavGroupsProps) {
    return (
        <nav aria-label="Main navigation" className="space-y-1 pb-2">
            {groups.map((group) => (
                <NavGroupSection key={group.title} group={group} />
            ))}
        </nav>
    );
});

/** @deprecated Use SidebarNavGroups — kept for backward compatibility */
export function NavMain({ items = [] }: { items?: import('@/types').NavItem[] }) {
    const group: NavGroup = {
        title: 'Platform',
        items,
    };

    return <SidebarNavGroups groups={[group]} />;
}
