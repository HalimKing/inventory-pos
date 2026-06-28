import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    BarChart3,
    DollarSign,
    Download,
    FileSpreadsheet,
    Loader2,
    Package,
    Receipt,
    ShoppingCart,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';

interface ReportData {
    period: string;
    range: { from: string; to: string };
    summary: {
        total_sales: number;
        total_transactions: number;
        average_ticket: number;
        items_sold: number;
    };
    performance_trend: Array<{
        label: string;
        sales: number;
        transactions: number;
    }>;
    payment_breakdown: Array<{
        method: string;
        count: number;
        amount: number;
    }>;
    top_products: Array<{
        name: string;
        quantity: number;
        revenue: number;
    }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cashier', href: '/cashier/dashboard' },
    { title: 'Reports', href: '/cashier/reports' },
];

function formatCurrency(value: number): string {
    return `GHS ${value.toFixed(2)}`;
}

function MetricCard({
    title,
    value,
    icon,
    loading,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    loading: boolean;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
        </Card>
    );
}

export default function CashierReportsPage() {
    const [period, setPeriod] = useState<Period>('daily');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get<ReportData>('/cashier/api/reports/data', {
                params: {
                    period,
                    date_from: period === 'custom' ? dateFrom : undefined,
                    date_to: period === 'custom' ? dateTo : undefined,
                },
            });
            setReport(data);
        } catch {
            toast.error('Failed to load report data.');
        } finally {
            setLoading(false);
        }
    }, [period, dateFrom, dateTo]);

    useEffect(() => {
        if (period === 'custom' && (!dateFrom || !dateTo)) {
            return;
        }
        fetchReport();
    }, [fetchReport, period, dateFrom, dateTo]);

    const logExport = async (format: 'pdf' | 'excel') => {
        await axios.post('/cashier/api/reports/export-log', {
            format,
            period,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        });
    };

    const exportPdf = async () => {
        if (!report) {
            return;
        }

        setExporting('pdf');
        try {
            const doc = new jsPDF();
            let y = 15;

            doc.setFontSize(16);
            doc.text('Cashier Sales Report', 14, y);
            y += 8;
            doc.setFontSize(10);
            doc.text(`Period: ${report.period} (${report.range.from} to ${report.range.to})`, 14, y);
            y += 10;

            doc.text(`Total Sales: ${formatCurrency(report.summary.total_sales)}`, 14, y);
            y += 6;
            doc.text(`Transactions: ${report.summary.total_transactions}`, 14, y);
            y += 6;
            doc.text(`Average Ticket: ${formatCurrency(report.summary.average_ticket)}`, 14, y);
            y += 6;
            doc.text(`Items Sold: ${report.summary.items_sold}`, 14, y);
            y += 10;

            doc.text('Payment Breakdown', 14, y);
            y += 6;
            report.payment_breakdown.forEach((row) => {
                doc.text(`${row.method}: ${row.count} tx — ${formatCurrency(row.amount)}`, 14, y);
                y += 5;
            });

            y += 5;
            doc.text('Top Products', 14, y);
            y += 6;
            report.top_products.slice(0, 10).forEach((product) => {
                doc.text(`${product.name}: ${product.quantity} sold — ${formatCurrency(product.revenue)}`, 14, y);
                y += 5;
            });

            doc.save(`cashier-report-${report.range.from}-${report.range.to}.pdf`);
            await logExport('pdf');
            toast.success('Report exported as PDF.');
        } catch {
            toast.error('Failed to export PDF.');
        } finally {
            setExporting(null);
        }
    };

    const exportExcel = async () => {
        if (!report) {
            return;
        }

        setExporting('excel');
        try {
            const summarySheet = XLSX.utils.json_to_sheet([
                {
                    Period: report.period,
                    From: report.range.from,
                    To: report.range.to,
                    'Total Sales': report.summary.total_sales,
                    Transactions: report.summary.total_transactions,
                    'Average Ticket': report.summary.average_ticket,
                    'Items Sold': report.summary.items_sold,
                },
            ]);

            const trendSheet = XLSX.utils.json_to_sheet(
                report.performance_trend.map((row) => ({
                    Label: row.label,
                    Sales: row.sales,
                    Transactions: row.transactions,
                })),
            );

            const paymentSheet = XLSX.utils.json_to_sheet(
                report.payment_breakdown.map((row) => ({
                    Method: row.method,
                    Count: row.count,
                    Amount: row.amount,
                })),
            );

            const productsSheet = XLSX.utils.json_to_sheet(
                report.top_products.map((row) => ({
                    Product: row.name,
                    Quantity: row.quantity,
                    Revenue: row.revenue,
                })),
            );

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
            XLSX.utils.book_append_sheet(workbook, trendSheet, 'Performance');
            XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payments');
            XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');

            XLSX.writeFile(workbook, `cashier-report-${report.range.from}-${report.range.to}.xlsx`);
            await logExport('excel');
            toast.success('Report exported as Excel.');
        } catch {
            toast.error('Failed to export Excel file.');
        } finally {
            setExporting(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sales Reports</h1>
                        <p className="text-muted-foreground text-sm">
                            Analyze your sales performance over time.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportPdf}
                            disabled={!report || loading || exporting !== null}
                        >
                            {exporting === 'pdf' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Export PDF
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportExcel}
                            disabled={!report || loading || exporting !== null}
                        >
                            {exporting === 'excel' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                            )}
                            Export Excel
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                            <TabsList className="responsive-tabs-grid-4 mb-4">
                                <TabsTrigger value="daily">Daily</TabsTrigger>
                                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                <TabsTrigger value="custom">Custom</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {period === 'custom' && (
                            <div className="mb-4 grid gap-3 sm:grid-cols-2">
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    aria-label="Custom range start"
                                />
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    aria-label="Custom range end"
                                />
                            </div>
                        )}

                        {report && (
                            <p className="text-muted-foreground text-sm">
                                Showing data from {report.range.from} to {report.range.to}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Total Sales"
                        value={formatCurrency(report?.summary.total_sales ?? 0)}
                        icon={<DollarSign className="text-muted-foreground h-4 w-4" />}
                        loading={loading}
                    />
                    <MetricCard
                        title="Transactions"
                        value={String(report?.summary.total_transactions ?? 0)}
                        icon={<Receipt className="text-muted-foreground h-4 w-4" />}
                        loading={loading}
                    />
                    <MetricCard
                        title="Average Ticket"
                        value={formatCurrency(report?.summary.average_ticket ?? 0)}
                        icon={<ShoppingCart className="text-muted-foreground h-4 w-4" />}
                        loading={loading}
                    />
                    <MetricCard
                        title="Items Sold"
                        value={String(report?.summary.items_sold ?? 0)}
                        icon={<Package className="text-muted-foreground h-4 w-4" />}
                        loading={loading}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BarChart3 className="h-5 w-5" />
                                Sales Performance
                            </CardTitle>
                            <CardDescription>Revenue and transaction volume over the selected period.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-72">
                            {loading ? (
                                <Skeleton className="h-full w-full" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={report?.performance_trend ?? []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="label" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip
                                            formatter={(value: number, name: string) =>
                                                name === 'sales' ? formatCurrency(value) : value
                                            }
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="sales"
                                            name="Sales"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="transactions"
                                            name="Transactions"
                                            stroke="hsl(var(--chart-2))"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Payment Methods</CardTitle>
                            <CardDescription>Breakdown by payment type.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-72">
                            {loading ? (
                                <Skeleton className="h-full w-full" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={report?.payment_breakdown ?? []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="method" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="amount" name="Amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Top Products</CardTitle>
                        <CardDescription>Best-selling items in this period.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={3}>
                                                    <Skeleton className="h-4 w-full" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (report?.top_products.length ?? 0) === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                                                No product data for this period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        report?.top_products.map((product) => (
                                            <TableRow key={product.name}>
                                                <TableCell>{product.name}</TableCell>
                                                <TableCell className="text-right">{product.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(product.revenue)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
