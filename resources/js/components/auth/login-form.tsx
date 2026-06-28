import PasswordInput from '@/components/auth/password-input';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { Form } from '@inertiajs/react';
import { AlertCircle, Mail } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface LoginFormProps {
    canResetPassword: boolean;
    status?: string;
}

const fieldOrder = ['email', 'password'] as const;

export default function LoginForm({
    canResetPassword,
    status,
}: LoginFormProps) {
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    return (
        <Form
            {...store.form()}
            resetOnSuccess={['password']}
            className="flex flex-col gap-6"
        >
            {({ processing, errors }) => (
                <LoginFormFields
                    canResetPassword={canResetPassword}
                    status={status}
                    processing={processing}
                    errors={errors}
                    emailRef={emailRef}
                    passwordRef={passwordRef}
                />
            )}
        </Form>
    );
}

interface LoginFormFieldsProps {
    canResetPassword: boolean;
    status?: string;
    processing: boolean;
    errors: Partial<Record<(typeof fieldOrder)[number], string>>;
    emailRef: React.RefObject<HTMLInputElement | null>;
    passwordRef: React.RefObject<HTMLInputElement | null>;
}

function LoginFormFields({
    canResetPassword,
    status,
    processing,
    errors,
    emailRef,
    passwordRef,
}: LoginFormFieldsProps) {
    const hasCredentialError = Boolean(errors.email || errors.password);

    useEffect(() => {
        for (const field of fieldOrder) {
            if (errors[field]) {
                const element =
                    field === 'email'
                        ? emailRef.current
                        : passwordRef.current;

                element?.focus();
                break;
            }
        }
    }, [errors, emailRef, passwordRef]);

    return (
        <>
            {status && (
                <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
                >
                    {status}
                </div>
            )}

            {hasCredentialError && (
                <div
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-3 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 px-4 py-3 text-sm text-[#DC2626]"
                >
                    <AlertCircle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                    />
                    <div>
                        <p className="font-medium">Unable to sign in</p>
                        <p className="mt-0.5 text-[#DC2626]/90">
                            {errors.email ??
                                errors.password ??
                                'Please check your credentials and try again.'}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid gap-5">
                <div className="grid gap-2">
                    <Label
                        htmlFor="email"
                        className="text-sm font-medium text-slate-700"
                    >
                        Email address
                    </Label>
                    <div className="relative">
                        <Mail
                            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
                            aria-hidden
                        />
                        <Input
                            ref={emailRef}
                            id="email"
                            type="email"
                            name="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            placeholder="you@mall.com"
                            aria-invalid={errors.email ? true : undefined}
                            aria-describedby={
                                errors.email ? 'email-error' : undefined
                            }
                            className={cn(
                                'h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 shadow-sm transition-all duration-200',
                                'hover:border-slate-300 hover:bg-white',
                                'focus:border-[#1E3A8A] focus:bg-white focus:shadow-md focus:shadow-[#1E3A8A]/10 focus:ring-0',
                                errors.email &&
                                    'border-[#DC2626]/60 focus:border-[#DC2626] focus:shadow-[#DC2626]/10',
                            )}
                        />
                    </div>
                    <InputError
                        id="email-error"
                        message={hasCredentialError ? undefined : errors.email}
                        role="alert"
                    />
                </div>

                <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                        <Label
                            htmlFor="password"
                            className="text-sm font-medium text-slate-700"
                        >
                            Password
                        </Label>
                        {canResetPassword && (
                            <TextLink
                                href={request()}
                                className="text-xs font-medium text-[#1E3A8A] no-underline decoration-transparent hover:text-[#1E3A8A]/80 hover:underline"
                                tabIndex={5}
                            >
                                Forgot password?
                            </TextLink>
                        )}
                    </div>
                    <PasswordInput
                        ref={passwordRef}
                        id="password"
                        tabIndex={2}
                        hideLabel
                        error={errors.password}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Checkbox
                        id="remember"
                        name="remember"
                        tabIndex={3}
                        className="border-slate-300 data-[state=checked]:border-[#1E3A8A] data-[state=checked]:bg-[#1E3A8A]"
                    />
                    <Label
                        htmlFor="remember"
                        className="cursor-pointer text-sm font-normal text-slate-600"
                    >
                        Remember me for 30 days
                    </Label>
                </div>

                <Button
                    type="submit"
                    tabIndex={4}
                    disabled={processing}
                    data-test="login-button"
                    aria-busy={processing}
                    className={cn(
                        'group relative mt-1 h-11 w-full overflow-hidden rounded-xl text-sm font-semibold text-white shadow-lg transition-all duration-200',
                        'bg-[#1E3A8A] shadow-[#1E3A8A]/25 hover:bg-[#172554] hover:shadow-xl hover:shadow-[#1E3A8A]/30',
                        'active:scale-[0.98] disabled:scale-100 disabled:opacity-70',
                        'focus-visible:ring-[#1E3A8A]/40',
                    )}
                >
                    <span
                        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                        aria-hidden
                    />
                    {processing ? (
                        <>
                            <Spinner className="size-4" />
                            Signing in...
                        </>
                    ) : (
                        'Sign in'
                    )}
                </Button>
            </div>
        </>
    );
}
