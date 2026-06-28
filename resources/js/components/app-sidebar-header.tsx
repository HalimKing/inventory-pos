import { Breadcrumbs } from '@/components/breadcrumbs';
import { HeaderNotifications } from '@/components/header/header-notifications';
import { HeaderThemeToggle } from '@/components/header/header-theme-toggle';
import { HeaderUserMenu } from '@/components/header/header-user-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md transition-[width,height] ease-linear sm:h-16 md:px-4 lg:px-6 dark:border-slate-800 dark:bg-slate-950/90 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1 size-10 shrink-0 rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm hover:bg-slate-50 hover:text-[#1E3A8A] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-[#FBBF24]" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <HeaderThemeToggle />
                <HeaderNotifications />
                <HeaderUserMenu />
            </div>
        </header>
    );
}
