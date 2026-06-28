import { resolveStorageUrl } from '@/lib/utils';
import { type Company } from '@/types/index.d';
import { usePage } from '@inertiajs/react';
import {
    BarChart3,
    ShieldCheck,
    ShoppingBag,
    Store,
} from 'lucide-react';
import { type PropsWithChildren } from 'react';

interface LoginPageProps {
    company?: Company | null;
    name?: string;
}

const features = [
    {
        icon: ShoppingBag,
        title: 'Point of Sale',
        description: 'Fast checkout for cashiers and floor staff',
    },
    {
        icon: BarChart3,
        title: 'Live Inventory',
        description: 'Real-time stock across every store location',
    },
    {
        icon: ShieldCheck,
        title: 'Secure Access',
        description: 'Role-based control for managers and admins',
    },
];

export default function LoginLayout({ children }: PropsWithChildren) {
    const { company, name } = usePage<LoginPageProps>().props;
    const companyName = company?.company_name ?? name ?? 'Mall POS';
    const logoUrl =
        resolveStorageUrl(company?.logo) ?? '/favicon.png';

    return (
        <div className="relative min-h-dvh bg-slate-50">
            <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
                {/* Brand panel */}
                <aside
                    className="relative hidden overflow-hidden lg:flex lg:flex-col"
                    aria-hidden={false}
                >
                    <div className="absolute inset-0 bg-[#1E3A8A]" />
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            backgroundImage: `
                                radial-gradient(circle at 20% 20%, #FBBF24 0%, transparent 35%),
                                radial-gradient(circle at 80% 80%, #DC2626 0%, transparent 30%)
                            `,
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-[0.07]"
                        style={{
                            backgroundImage:
                                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                            backgroundSize: '48px 48px',
                        }}
                    />

                    <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
                        <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="flex items-center gap-4">
                                <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur-sm">
                                    <img
                                        src={logoUrl}
                                        alt={`${companyName} logo`}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold tracking-[0.2em] text-[#FBBF24] uppercase">
                                        Mall POS System
                                    </p>
                                    <h2 className="text-xl font-semibold text-white">
                                        {companyName}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 animate-in fade-in slide-in-from-left-6 duration-700 delay-150 fill-mode-backwards">
                            <div>
                                <h1 className="text-4xl leading-tight font-bold tracking-tight text-white xl:text-5xl">
                                    Retail operations,
                                    <span className="mt-1 block text-[#FBBF24]">
                                        simplified.
                                    </span>
                                </h1>
                                <p className="mt-4 max-w-md text-base leading-relaxed text-blue-100/90">
                                    Manage sales, inventory, and reporting from
                                    one secure platform built for modern mall
                                    retail teams.
                                </p>
                            </div>

                            <ul className="space-y-4">
                                {features.map(({ icon: Icon, title, description }) => (
                                    <li
                                        key={title}
                                        className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:bg-white/10"
                                    >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FBBF24]/15 text-[#FBBF24]">
                                            <Icon className="size-5" aria-hidden />
                                        </span>
                                        <div>
                                            <p className="font-medium text-white">
                                                {title}
                                            </p>
                                            <p className="mt-0.5 text-sm text-blue-100/75">
                                                {description}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="text-sm text-blue-200/60">
                            &copy; {new Date().getFullYear()} {companyName}. All
                            rights reserved.
                        </p>
                    </div>
                </aside>

                {/* Form panel */}
                <main className="relative flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
                    <div
                        className="pointer-events-none absolute inset-0 lg:hidden"
                        aria-hidden
                    >
                        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#1E3A8A]/10 to-transparent" />
                    </div>

                    <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="mb-8 flex flex-col items-center text-center lg:hidden">
                            <div className="mb-4 flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg shadow-[#1E3A8A]/10 ring-1 ring-slate-200">
                                <img
                                    src={logoUrl}
                                    alt={`${companyName} logo`}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                            <p className="text-xs font-semibold tracking-[0.18em] text-[#1E3A8A] uppercase">
                                {companyName}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
                            <div className="mb-8 hidden lg:block">
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#1E3A8A]/8 px-3 py-1 text-xs font-medium text-[#1E3A8A]">
                                    <Store className="size-3.5" aria-hidden />
                                    Staff Portal
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    Welcome back
                                </h1>
                                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                    Sign in to access the Mall POS System
                                </p>
                            </div>

                            <div className="mb-6 lg:hidden">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    Welcome back
                                </h1>
                                <p className="mt-2 text-sm text-slate-500">
                                    Sign in to access the Mall POS System
                                </p>
                            </div>

                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
