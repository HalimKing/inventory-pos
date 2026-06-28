import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

export function ResponsiveTable({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                '-mx-1 overflow-x-auto rounded-md border px-1 sm:mx-0 sm:px-0',
                className,
            )}
            {...props}
        />
    );
}
