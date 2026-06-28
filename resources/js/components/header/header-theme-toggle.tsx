import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { type HTMLAttributes } from 'react';

export function HeaderThemeToggle({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const options = [
        { value: 'light' as const, label: 'Light', icon: Sun },
        { value: 'dark' as const, label: 'Dark', icon: Moon },
        { value: 'system' as const, label: 'System', icon: Monitor },
    ];

    const CurrentIcon =
        options.find((o) => o.value === appearance)?.icon ?? Sun;

    return (
        <div className={className} {...props}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm hover:bg-slate-50 hover:text-[#1E3A8A] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-[#FBBF24]"
                        aria-label="Toggle theme"
                    >
                        <CurrentIcon className="size-[18px]" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
                    {options.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => updateAppearance(value)}
                            className={cn(
                                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
                                appearance === value &&
                                    'bg-[#1E3A8A]/8 font-medium text-[#1E3A8A] dark:text-[#FBBF24]',
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span className="flex-1 text-left">{label}</span>
                            {appearance === value && (
                                <Check className="size-4 shrink-0" />
                            )}
                        </button>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
