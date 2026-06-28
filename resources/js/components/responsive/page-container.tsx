import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

export function PageContainer({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10',
                className,
            )}
            {...props}
        />
    );
}
