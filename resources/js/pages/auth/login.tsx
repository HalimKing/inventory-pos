import LoginForm from '@/components/auth/login-form';
import LoginLayout from '@/layouts/auth/login-layout';
import { Head } from '@inertiajs/react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
}

export default function Login({
    status,
    canResetPassword,
}: LoginProps) {
    return (
        <LoginLayout>
            <Head title="Sign in" />

            <LoginForm
                canResetPassword={canResetPassword}
                status={status}
            />
        </LoginLayout>
    );
}
