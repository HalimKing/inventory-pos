import { UserMenuContent } from '@/components/user-menu-content';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import { getRoleLabel } from '@/lib/sidebar-utils';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';

export function HeaderUserMenu() {
    const { auth } = usePage<SharedData>().props;
    const getInitials = useInitials();
    const roleLabel = getRoleLabel(auth.user);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        'h-10 gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-2 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80',
                        'sm:pl-2 sm:pr-3',
                    )}
                    data-test="header-user-menu"
                >
                    <Avatar className="size-8 ring-2 ring-[#1E3A8A]/15">
                        <AvatarImage
                            src={auth.user.avatar}
                            alt={auth.user.name}
                        />
                        <AvatarFallback className="bg-[#1E3A8A] text-xs font-semibold text-white">
                            {getInitials(auth.user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden min-w-0 text-left sm:grid">
                        <span className="truncate text-sm font-medium leading-tight">
                            {auth.user.name}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                            {roleLabel}
                        </span>
                    </div>
                    <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl"
                sideOffset={8}
            >
                <UserMenuContent user={auth.user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
