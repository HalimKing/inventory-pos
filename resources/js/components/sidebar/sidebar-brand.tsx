import { useSidebar } from '@/components/ui/sidebar';
import { getDashboardHref } from '@/lib/sidebar-utils';
import { resolveStorageUrl } from '@/lib/utils';
import { type Company, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function SidebarBrand() {
    const { company, name, auth } = usePage<
        SharedData & { company?: Company | null }
    >().props;
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;

    const companyName = company?.company_name ?? name ?? 'Mall POS';
    const logoUrl =
        resolveStorageUrl(company?.logo) ?? '/favicon.png';
    const dashboardHref = getDashboardHref(auth.user);

    return (
        <Link
            href={dashboardHref}
            prefetch
            className="group/brand flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#FBBF24]/50 focus-visible:outline-none"
        >
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1.5 ring-1 ring-white/15 transition-transform group-hover/brand:scale-105">
                <img
                    src={logoUrl}
                    alt={`${companyName} logo`}
                    className="max-h-full max-w-full object-contain"
                />
            </div>
            {!isCollapsed && (
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold text-white">
                        {companyName}
                    </span>
                    <span className="truncate text-[11px] font-medium tracking-wide text-[#FBBF24] uppercase">
                        Mall POS
                    </span>
                </div>
            )}
        </Link>
    );
}
