import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { forwardRef, useId, useState } from 'react';

interface PasswordInputProps {
    id?: string;
    name?: string;
    label?: string;
    error?: string;
    placeholder?: string;
    autoComplete?: string;
    tabIndex?: number;
    required?: boolean;
    className?: string;
    hideLabel?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    function PasswordInput(
        {
            id: idProp,
            name = 'password',
            label = 'Password',
            error,
            placeholder = 'Enter your password',
            autoComplete = 'current-password',
            tabIndex,
            required = true,
            className,
            hideLabel = false,
        },
        ref,
    ) {
        const generatedId = useId();
        const id = idProp ?? generatedId;
        const errorId = `${id}-error`;
        const [visible, setVisible] = useState(false);

        return (
            <div className={cn('grid gap-2', className)}>
                {!hideLabel && (
                    <Label
                        htmlFor={id}
                        className="text-sm font-medium text-slate-700"
                    >
                        {label}
                    </Label>
                )}
                <div className="relative">
                    <Lock
                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
                        aria-hidden
                    />
                    <Input
                        ref={ref}
                        id={id}
                        name={name}
                        type={visible ? 'text' : 'password'}
                        required={required}
                        tabIndex={tabIndex}
                        autoComplete={autoComplete}
                        placeholder={placeholder}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                        className={cn(
                            'h-11 rounded-xl border-slate-200 bg-slate-50/80 pr-11 pl-10 shadow-sm transition-all duration-200',
                            'hover:border-slate-300 hover:bg-white',
                            'focus:border-[#1E3A8A] focus:bg-white focus:shadow-md focus:shadow-[#1E3A8A]/10 focus:ring-0',
                            error &&
                                'border-[#DC2626]/60 focus:border-[#DC2626] focus:shadow-[#DC2626]/10',
                        )}
                    />
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setVisible((current) => !current)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-[#1E3A8A] focus-visible:ring-2 focus-visible:ring-[#1E3A8A]/30 focus-visible:outline-none"
                        aria-label={
                            visible ? 'Hide password' : 'Show password'
                        }
                    >
                        {visible ? (
                            <EyeOff className="size-4" aria-hidden />
                        ) : (
                            <Eye className="size-4" aria-hidden />
                        )}
                    </button>
                </div>
                <InputError id={errorId} message={error} role="alert" />
            </div>
        );
    },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
