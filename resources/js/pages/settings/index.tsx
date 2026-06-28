import InputError from '@/components/input-error';
import { PageContainer } from '@/components/responsive/page-container';
import { PageHeader } from '@/components/responsive/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn, resolveStorageUrl } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Globe,
    Heart,
    ImageIcon,
    Mail,
    MapPin,
    Phone,
    Receipt,
    RefreshCw,
    Save,
    Settings2,
    Upload,
    type LucideIcon,
} from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';

interface CompanyInfo {
    companyName: string;
    email: string;
    phone: string;
    address: string;
    country: string;
    website: string;
    returnPolicy: string;
    thankYouMessage: string;
    logo?: string;
}

type FormData = CompanyInfo & { logoFile: File | null };

function FieldGroup({
    label,
    htmlFor,
    error,
    hint,
    required,
    children,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
                {label}
                {required && (
                    <span className="ml-0.5 text-[#DC2626]" aria-hidden>
                        *
                    </span>
                )}
            </Label>
            {children}
            <InputError message={error} />
            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
        </div>
    );
}

function IconInput({
    icon: Icon,
    className,
    ...props
}: React.ComponentProps<typeof Input> & { icon: LucideIcon }) {
    return (
        <div className="relative">
            <Icon
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
            />
            <Input
                className={cn(
                    'h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 shadow-sm transition-all duration-200',
                    'hover:border-slate-300 hover:bg-white',
                    'focus:border-[#1E3A8A] focus:bg-white focus:shadow-md focus:shadow-[#1E3A8A]/10 focus:ring-0',
                    className,
                )}
                {...props}
            />
        </div>
    );
}

function ReceiptPreview({ data, logoPreview }: { data: FormData; logoPreview: string | null }) {
    return (
        <Card className="overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/50">
            <div className="bg-[#1E3A8A] px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                    <Receipt className="size-4 text-[#FBBF24]" aria-hidden />
                    <span className="text-sm font-semibold">Receipt Preview</span>
                </div>
            </div>
            <CardContent className="space-y-4 p-5 font-mono text-xs leading-relaxed">
                <div className="flex flex-col items-center border-b border-dashed border-slate-200 pb-4 text-center">
                    {logoPreview ? (
                        <img
                            src={logoPreview}
                            alt=""
                            className="mb-2 max-h-12 max-w-[120px] object-contain"
                        />
                    ) : (
                        <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-slate-100">
                            <Building2 className="size-6 text-slate-400" />
                        </div>
                    )}
                    <p className="text-sm font-bold uppercase">
                        {data.companyName || 'Your Company Name'}
                    </p>
                    <p className="mt-1 text-slate-500">{data.address || 'Street address'}</p>
                    <p className="text-slate-500">
                        Tel: {data.phone || '000-000-0000'}
                    </p>
                    <p className="text-slate-500">{data.email || 'email@company.com'}</p>
                </div>
                <div className="space-y-1 text-slate-400">
                    <p>— — — line items — — —</p>
                </div>
                <div className="space-y-2 border-t border-dashed border-slate-200 pt-3 text-slate-600">
                    {data.returnPolicy && (
                        <p>
                            <span className="font-semibold">Return Policy:</span>{' '}
                            {data.returnPolicy}
                        </p>
                    )}
                    {data.thankYouMessage && (
                        <p className="text-center font-medium text-[#1E3A8A]">
                            {data.thankYouMessage}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function CompanySettingsForm(companySettings: CompanyInfo) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialLogo = resolveStorageUrl(companySettings.logo);

    const { data, setData, post, processing, errors, recentlySuccessful } =
        useForm<FormData>({
            companyName: companySettings.companyName || '',
            email: companySettings.email || '',
            phone: companySettings.phone || '',
            address: companySettings.address || '',
            country: companySettings.country || '',
            website: companySettings.website || '',
            returnPolicy: companySettings.returnPolicy || '',
            thankYouMessage: companySettings.thankYouMessage || '',
            logoFile: null,
        });

    const [logoPreview, setLogoPreview] = useState<string | null>(initialLogo);
    const [activeTab, setActiveTab] = useState('general');

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setData(name as keyof CompanyInfo, value);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        setData('logoFile', file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/update', {
            forceFormData: true,
        });
    };

    const inputClass =
        'h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-[#1E3A8A] focus:bg-white focus:shadow-md focus:shadow-[#1E3A8A]/10 focus:ring-0';

    return (
        <PageContainer className="pb-28">
            <PageHeader
                title="Company Settings"
                description="Manage your mall branding, contact details, and receipt messages."
                actions={
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1E3A8A]/15 bg-[#1E3A8A]/5 px-3 py-1 text-xs font-medium text-[#1E3A8A]">
                        <Settings2 className="size-3.5" aria-hidden />
                        Admin Configuration
                    </span>
                }
            />

            {recentlySuccessful && (
                <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
                    <CheckCircle2 className="size-4" />
                    <AlertDescription>
                        Company information updated successfully!
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 xl:grid-cols-[1fr_320px] xl:items-start">
                    <div className="min-w-0 space-y-6">
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="w-full"
                        >
                            <TabsList className="mb-2 grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-slate-100/80 p-1">
                                <TabsTrigger
                                    value="general"
                                    className="rounded-lg py-2.5 text-xs data-[state=active]:bg-white data-[state=active]:text-[#1E3A8A] data-[state=active]:shadow-sm sm:text-sm"
                                >
                                    <Building2 className="mr-1.5 size-4 shrink-0" />
                                    General
                                </TabsTrigger>
                                <TabsTrigger
                                    value="contact"
                                    className="rounded-lg py-2.5 text-xs data-[state=active]:bg-white data-[state=active]:text-[#1E3A8A] data-[state=active]:shadow-sm sm:text-sm"
                                >
                                    <MapPin className="mr-1.5 size-4 shrink-0" />
                                    Contact
                                </TabsTrigger>
                                <TabsTrigger
                                    value="receipts"
                                    className="rounded-lg py-2.5 text-xs data-[state=active]:bg-white data-[state=active]:text-[#1E3A8A] data-[state=active]:shadow-sm sm:text-sm"
                                >
                                    <Receipt className="mr-1.5 size-4 shrink-0" />
                                    Receipts
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="mt-4 space-y-6">
                                <Card className="border-slate-200/80 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <span className="flex size-8 items-center justify-center rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A]">
                                                <ImageIcon className="size-4" />
                                            </span>
                                            Brand Identity
                                        </CardTitle>
                                        <CardDescription>
                                            Your logo appears on receipts, the
                                            sidebar, and customer-facing
                                            documents.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                            <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                                                {logoPreview ? (
                                                    <img
                                                        src={logoPreview}
                                                        alt="Company logo preview"
                                                        className="max-h-full max-w-full object-contain p-2"
                                                    />
                                                ) : (
                                                    <Building2 className="size-10 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                <input
                                                    ref={fileInputRef}
                                                    id="logo-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className="sr-only"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="rounded-xl border-slate-200"
                                                    onClick={() =>
                                                        fileInputRef.current?.click()
                                                    }
                                                >
                                                    <Upload className="mr-2 size-4" />
                                                    Upload Logo
                                                </Button>
                                                <InputError message={errors.logoFile} />
                                                <p className="text-xs text-muted-foreground">
                                                    PNG or JPG, max 5MB.
                                                    Recommended: square image,
                                                    256×256px or larger.
                                                </p>
                                            </div>
                                        </div>

                                        <Separator />

                                        <FieldGroup
                                            label="Company Name"
                                            htmlFor="companyName"
                                            error={errors.companyName}
                                            required
                                        >
                                            <Input
                                                id="companyName"
                                                name="companyName"
                                                value={data.companyName}
                                                onChange={handleInputChange}
                                                className={inputClass}
                                                required
                                            />
                                        </FieldGroup>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="contact" className="mt-4 space-y-6">
                                <Card className="border-slate-200/80 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <span className="flex size-8 items-center justify-center rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A]">
                                                <Phone className="size-4" />
                                            </span>
                                            Contact Details
                                        </CardTitle>
                                        <CardDescription>
                                            How customers and staff can reach
                                            your mall or store.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <FieldGroup
                                                label="Email Address"
                                                htmlFor="email"
                                                error={errors.email}
                                                required
                                            >
                                                <IconInput
                                                    icon={Mail}
                                                    id="email"
                                                    type="email"
                                                    name="email"
                                                    value={data.email}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </FieldGroup>
                                            <FieldGroup
                                                label="Phone Number"
                                                htmlFor="phone"
                                                error={errors.phone}
                                                required
                                            >
                                                <IconInput
                                                    icon={Phone}
                                                    id="phone"
                                                    type="tel"
                                                    name="phone"
                                                    value={data.phone}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </FieldGroup>
                                            <div className="sm:col-span-2">
                                                <FieldGroup
                                                    label="Website"
                                                    htmlFor="website"
                                                    error={errors.website}
                                                    hint="Optional — include https://"
                                                >
                                                    <IconInput
                                                        icon={Globe}
                                                        id="website"
                                                        type="url"
                                                        name="website"
                                                        value={data.website}
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        placeholder="https://yourmall.com"
                                                    />
                                                </FieldGroup>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200/80 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <span className="flex size-8 items-center justify-center rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A]">
                                                <MapPin className="size-4" />
                                            </span>
                                            Location
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 gap-5">
                                            <FieldGroup
                                                label="Street Address"
                                                htmlFor="address"
                                                error={errors.address}
                                                required
                                            >
                                                <Input
                                                    id="address"
                                                    name="address"
                                                    value={data.address}
                                                    onChange={handleInputChange}
                                                    className={inputClass}
                                                    required
                                                />
                                            </FieldGroup>
                                            <FieldGroup
                                                label="Country"
                                                htmlFor="country"
                                                error={errors.country}
                                                required
                                            >
                                                <Input
                                                    id="country"
                                                    name="country"
                                                    value={data.country}
                                                    onChange={handleInputChange}
                                                    className={inputClass}
                                                    required
                                                />
                                            </FieldGroup>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="receipts" className="mt-4 space-y-6">
                                <Card className="border-slate-200/80 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <span className="flex size-8 items-center justify-center rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A]">
                                                <Receipt className="size-4" />
                                            </span>
                                            Receipt Messages
                                        </CardTitle>
                                        <CardDescription>
                                            These messages print on every
                                            customer receipt at checkout.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <FieldGroup
                                            label="Return Policy"
                                            htmlFor="returnPolicy"
                                            error={errors.returnPolicy}
                                            hint="Displayed on receipts and return documentation."
                                            required
                                        >
                                            <div className="relative">
                                                <RefreshCw className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-slate-400" />
                                                <Textarea
                                                    id="returnPolicy"
                                                    name="returnPolicy"
                                                    value={data.returnPolicy}
                                                    onChange={handleInputChange}
                                                    rows={3}
                                                    placeholder="e.g. Returns accepted within 7 days with original receipt..."
                                                    className="min-h-[88px] rounded-xl border-slate-200 bg-slate-50/80 pl-10 shadow-sm focus:border-[#1E3A8A] focus:bg-white focus:ring-0"
                                                    required
                                                />
                                            </div>
                                        </FieldGroup>

                                        <Separator />

                                        <FieldGroup
                                            label="Thank You Message"
                                            htmlFor="thankYouMessage"
                                            error={errors.thankYouMessage}
                                            hint="Shown at the bottom of every receipt."
                                            required
                                        >
                                            <div className="relative">
                                                <Heart className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-slate-400" />
                                                <Textarea
                                                    id="thankYouMessage"
                                                    name="thankYouMessage"
                                                    value={data.thankYouMessage}
                                                    onChange={handleInputChange}
                                                    rows={3}
                                                    placeholder="e.g. Thank you for shopping with us!"
                                                    className="min-h-[88px] rounded-xl border-slate-200 bg-slate-50/80 pl-10 shadow-sm focus:border-[#1E3A8A] focus:bg-white focus:ring-0"
                                                    required
                                                />
                                            </div>
                                        </FieldGroup>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <aside className="hidden xl:block xl:sticky xl:top-6">
                        <ReceiptPreview data={data} logoPreview={logoPreview} />
                        <p className="mt-3 text-center text-xs text-muted-foreground">
                            Live preview updates as you type
                        </p>
                    </aside>
                </div>

                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8 xl:static xl:mt-8 xl:border-0 xl:bg-transparent xl:p-0 xl:backdrop-blur-none">
                    <div className="mx-auto flex max-w-7xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl sm:min-w-[120px]"
                            onClick={() => window.history.back()}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-11 rounded-xl bg-[#1E3A8A] shadow-lg shadow-[#1E3A8A]/20 hover:bg-[#172554] sm:min-w-[160px]"
                        >
                            {processing ? (
                                <>
                                    <Spinner className="size-4" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="size-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </PageContainer>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/admin/settings/index',
    },
];

export default function SettingsIndex({
    companySettings,
}: {
    companySettings: CompanyInfo;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Company Settings" />
            <CompanySettingsForm {...companySettings} />
        </AppLayout>
    );
}
