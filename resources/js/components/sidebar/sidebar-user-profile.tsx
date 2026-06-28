import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import { getRoleLabel } from '@/lib/sidebar-utils';
import { type User } from '@/types';
import { Shield } from 'lucide-react';
import { memo } from 'react';

interface SidebarUserProfileProps {
    user: User;
}

export const SidebarUserProfile = memo(function SidebarUserProfile({
    user,
}: SidebarUserProfileProps) {
    const getInitials = useInitials();
    const { state, isMobile } = useSidebar();
    const roleLabel = getRoleLabel(user);
    const isCollapsed = state === 'collapsed' && !isMobile;

    const avatar = (
        <Avatar className="size-10 shrink-0 ring-2 ring-[#FBBF24]/30">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-[#1E3A8A] text-sm font-semibold text-white">
                {getInitials(user.name)}
            </AvatarFallback>
        </Avatar>
    );

    if (isCollapsed) {
        return (
            <div className="flex justify-center px-2 py-1">
                <Tooltip>
                    <TooltipTrigger asChild>{avatar}</TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col gap-0.5">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {roleLabel}
                        </span>
                    </TooltipContent>
                </Tooltip>
            </div>
        );
    }

    return (
        <div
            className="mx-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:bg-white/[0.08]"
            aria-label={`Signed in as ${user.name}, ${roleLabel}`}
        >
            <div className="flex items-center gap-3">
                {avatar}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                        {user.name}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-blue-100/80">
                        <Shield className="size-3 shrink-0 text-[#FBBF24]" aria-hidden />
                        {roleLabel}
                    </p>
                </div>
            </div>
        </div>
    );
});
