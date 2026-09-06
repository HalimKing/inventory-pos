import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    downloadReceiptPdf,
    mapSaleToReceipt,
    printReceipt,
    type CompanySettings,
} from '@/lib/receipt';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Loader2,
    Mail,
    Printer,
    Receipt,
    RotateCcw,
    Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

interface TransactionSummary {
    id: string;
    transaction_id: string;
    reference: string | null;
    customer_name: string;
    payment_method: string;
    status: string;
    sub_total: number;
    discount_amount: number;
    grand_total: number;
    amount_paid: number;
    change_amount: number;
    items_count: number;
    created_at: string;
    created_at_formatted: string;
}

interface TransactionDetail extends TransactionSummary {
    discount_percentage: number;
    items: Array<{
        id: number;
        product_id: string;
        product_name: string;
        category: string | null;
        quantity: number;
        price: number;
        subtotal: number;
    }>;
}

interface PaginatedResponse {
    data: TransactionSummary[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cashier', href: '/cashier/dashboard' },
    { title: 'Transaction History', href: '/cashier/transactions' },
];

const paymentMethods = [
    { value: 'all', label: 'All methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'momo', label: 'Mobile Money' },
    { value: 'card', label: 'Card' },
];

function formatCurrency(value: number): string {
    return `GHS ${value.toFixed(2)}`;
}

export default function CashierTransactionsPage({
    companySettings,
}: {
    companySettings: CompanySettings | null;
}) {
    const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);

    const [emailOpen, setEmailOpen] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [emailSending, setEmailSending] = useState(false);
    const [refundOpen, setRefundOpen] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [refundQuantity, setRefundQuantity] = useState<Record<string, string>>({});
    const [refundSubmitting, setRefundSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get<PaginatedResponse>('/cashier/api/transactions', {
                params: {
                    page,
                    per_page: 15,
                    search: debouncedSearch || undefined,
                    payment_method: paymentMethod !== 'all' ? paymentMethod : undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                },
            });

            setTransactions(data.data);
            setLastPage(data.last_page);
            setTotal(data.total);
        } catch {
            toast.error('Failed to load transactions.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, paymentMethod, dateFrom, dateTo]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, paymentMethod, dateFrom, dateTo]);

    const openDetail = async (id: string) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setSelectedTransaction(null);

        try {
            const { data } = await axios.get<TransactionDetail>(`/cashier/api/transactions/${id}`);
            setSelectedTransaction(data);
        } catch {
            toast.error('Failed to load transaction details.');
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const logReprint = async (saleId: string, channel: 'print' | 'pdf' | 'view') => {
        await axios.post(`/cashier/api/transactions/${saleId}/reprint-log`, { channel });
    };

    const handlePrint = async (transaction: TransactionDetail) => {
        setActionLoading(`${transaction.id}-print`);
        try {
            printReceipt(mapSaleToReceipt(transaction), companySettings);
            await logReprint(transaction.id, 'print');
            toast.success('Receipt opened for printing.');
        } catch {
            toast.error('Unable to print receipt.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDownloadPdf = async (transaction: TransactionDetail) => {
        setActionLoading(`${transaction.id}-pdf`);
        try {
            await downloadReceiptPdf(mapSaleToReceipt(transaction), companySettings);
            await logReprint(transaction.id, 'pdf');
            toast.success('Receipt downloaded.');
        } catch {
            toast.error('Unable to download receipt PDF.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleResendEmail = async () => {
        if (!selectedTransaction || !emailAddress.trim()) {
            return;
        }

        setEmailSending(true);
        try {
            const { data } = await axios.post(
                `/cashier/api/transactions/${selectedTransaction.id}/resend-receipt`,
                { email: emailAddress.trim() },
            );

            if (data.success) {
                toast.success(data.message ?? 'Receipt sent.');
                setEmailOpen(false);
                setEmailAddress('');
            } else {
                toast.error(data.message ?? 'Failed to send receipt.');
            }
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : 'Failed to send receipt.';
            toast.error(message);
        } finally {
            setEmailSending(false);
        }
    };

    const openRefundDialog = () => {
        if (!selectedTransaction) {
            return;
        }

        const defaults = Object.fromEntries(
            selectedTransaction.items.map((item) => [item.id, String(item.quantity)]),
        );
        setRefundQuantity(defaults);
        setRefundReason('');
        setDetailOpen(false);
        setRefundOpen(true);
    };

    const submitRefund = async () => {
        if (!selectedTransaction) {
            return;
        }

        const items = selectedTransaction.items
            .map((item) => {
                const quantity = Number(refundQuantity[item.id] ?? 0);
                if (!quantity || quantity <= 0) {
                    return null;
                }

                return {
                    sale_item_id: item.id,
                    quantity,
                };
            })
            .filter(Boolean);

        if (items.length === 0) {
            toast.error('Select at least one item to refund.');
            return;
        }

        setRefundSubmitting(true);
        try {
            const { data } = await axios.post(`/cashier/api/transactions/${selectedTransaction.id}/refund`, {
                reason: refundReason.trim() || undefined,
                items,
            });

            if (data.success) {
                toast.success(data.message ?? 'Refund processed.');
                setRefundOpen(false);
                setRefundReason('');
                await fetchTransactions();
            } else {
                toast.error(data.message ?? 'Failed to process refund.');
            }
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : 'Failed to process refund.';
            toast.error(message);
        } finally {
            setRefundSubmitting(false);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setPaymentMethod('all');
        setDateFrom('');
        setDateTo('');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transaction History" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
                    <p className="text-muted-foreground text-sm">
                        View, search, and reprint your processed sales.
                    </p>
                </div>

                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Filters</CardTitle>
                        <CardDescription>Search and narrow down your transactions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            <div className="relative lg:col-span-2">
                                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                                <Input
                                    placeholder="Transaction ID, customer, or reference..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map((method) => (
                                        <SelectItem key={method.value} value={method.value}>
                                            {method.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                aria-label="Date from"
                            />
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                aria-label="Date to"
                            />
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-lg">Transactions</CardTitle>
                            <CardDescription>{total} total transaction(s)</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Transaction ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead className="text-right">Items</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                {Array.from({ length: 7 }).map((__, j) => (
                                                    <TableCell key={j}>
                                                        <Skeleton className="h-4 w-full" />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : transactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                                                No transactions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        transactions.map((tx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="font-mono text-sm">
                                                    {tx.transaction_id}
                                                </TableCell>
                                                <TableCell>{tx.customer_name}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {tx.created_at_formatted}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {tx.payment_method?.toUpperCase() ?? 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{tx.items_count}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(tx.grand_total)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openDetail(tx.id)}
                                                    >
                                                        <Eye className="mr-1 h-4 w-4" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {!loading && lastPage > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-muted-foreground text-sm">
                                    Page {page} of {lastPage}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= lastPage}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Transaction Details
                        </DialogTitle>
                        <DialogDescription>
                            {selectedTransaction?.transaction_id ?? 'Loading...'}
                        </DialogDescription>
                    </DialogHeader>

                    {detailLoading || !selectedTransaction ? (
                        <div className="space-y-3 py-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-4 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <span className="text-muted-foreground">Customer</span>
                                    <p className="font-medium">{selectedTransaction.customer_name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Date</span>
                                    <p className="font-medium">{selectedTransaction.created_at_formatted}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Payment</span>
                                    <p className="font-medium uppercase">{selectedTransaction.payment_method}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Status</span>
                                    <p className="font-medium capitalize">{selectedTransaction.status}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedTransaction.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.product_name}</TableCell>
                                                <TableCell>{item.category ?? '—'}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(item.price)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(item.subtotal)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="bg-muted/40 space-y-1 rounded-md p-4 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(selectedTransaction.sub_total)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Discount</span>
                                    <span>{formatCurrency(selectedTransaction.discount_amount)}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span>Total</span>
                                    <span>{formatCurrency(selectedTransaction.grand_total)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Amount paid</span>
                                    <span>{formatCurrency(selectedTransaction.amount_paid)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Change</span>
                                    <span>{formatCurrency(selectedTransaction.change_amount)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedTransaction && (
                        <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Button
                                variant="outline"
                                onClick={() => handlePrint(selectedTransaction)}
                                disabled={actionLoading === `${selectedTransaction.id}-print`}
                            >
                                {actionLoading === `${selectedTransaction.id}-print` ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Printer className="mr-2 h-4 w-4" />
                                )}
                                Reprint
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleDownloadPdf(selectedTransaction)}
                                disabled={actionLoading === `${selectedTransaction.id}-pdf`}
                            >
                                {actionLoading === `${selectedTransaction.id}-pdf` ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                Download PDF
                            </Button>
                            <Button variant="outline" onClick={openRefundDialog}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Refund
                            </Button>
                            <Button onClick={() => setEmailOpen(true)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email Receipt
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Process Refund</DialogTitle>
                        <DialogDescription>
                            Choose the quantity to refund and add an optional reason.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="refund-reason">Reason (optional)</Label>
                            <Input
                                id="refund-reason"
                                placeholder="Customer requested a refund"
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                            />
                        </div>
                        <div className="space-y-3 rounded-md border p-3">
                            {selectedTransaction?.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{item.product_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Available: {item.quantity}
                                        </p>
                                    </div>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={item.quantity}
                                        value={refundQuantity[item.id] ?? ''}
                                        onChange={(e) =>
                                            setRefundQuantity((current) => ({
                                                ...current,
                                                [item.id]: e.target.value,
                                            }))
                                        }
                                        className="w-24"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRefundOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitRefund} disabled={refundSubmitting}>
                            {refundSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RotateCcw className="mr-2 h-4 w-4" />
                            )}
                            Process Refund
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Email Receipt</DialogTitle>
                        <DialogDescription>
                            Send a copy of receipt {selectedTransaction?.transaction_id} to the customer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="receipt-email">Email address</Label>
                        <Input
                            id="receipt-email"
                            type="email"
                            placeholder="customer@example.com"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmailOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleResendEmail} disabled={emailSending || !emailAddress.trim()}>
                            {emailSending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Mail className="mr-2 h-4 w-4" />
                            )}
                            Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
