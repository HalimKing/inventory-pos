import { cn } from '@/lib/utils';
import { type HTMLAttributes, type ReactNode } from 'react';

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({
    title,
    description,
    actions,
    className,
    ...props
}: PageHeaderProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between',
                className,
            )}
            {...props}
        >
            <div className="min-w-0 space-y-1">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-muted-foreground sm:text-base">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    {actions}
                </div>
            )}
        </div>
    );
}
