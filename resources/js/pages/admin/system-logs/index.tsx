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
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileSpreadsheet,
    Loader2,
    ScrollText,
    Search,
    Shield,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

interface LogSummary {
    id: number;
    event_type: string;
    module: string;
    severity: string;
    status: string;
    description: string;
    user_name: string | null;
    user_role: string | null;
    ip_address: string | null;
    resource_type: string | null;
    resource_id: string | null;
    created_at: string;
    created_at_formatted: string;
}

interface LogDetail extends LogSummary {
    user_id: number | null;
    user_agent: string | null;
    browser: string | null;
    device: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
}

interface UserOption {
    id: number;
    name: string;
    role: string | null;
}

interface RetentionSettings {
    retention_days: number;
    auto_purge_enabled: boolean;
}

interface PageProps {
    filterOptions: {
        modules: string[];
        severities: string[];
        statuses: string[];
    };
    users: UserOption[];
    retentionSettings: RetentionSettings;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/dashboard' },
    { title: 'System Logs', href: '/admin/system-logs' },
];

function severityBadge(severity: string) {
    const variants: Record<string, string> = {
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        critical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };

    return (
        <Badge variant="outline" className={variants[severity] ?? ''}>
            {severity}
        </Badge>
    );
}

function statusBadge(status: string) {
    const variants: Record<string, string> = {
        success: 'border-green-500 text-green-700',
        failed: 'border-red-500 text-red-700',
        warning: 'border-amber-500 text-amber-700',
    };

    return (
        <Badge variant="outline" className={variants[status] ?? ''}>
            {status}
        </Badge>
    );
}

function MetricCard({
    title,
    value,
    icon,
    loading,
}: {
    title: string;
    value: number;
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
                {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
        </Card>
    );
}

export default function SystemLogsPage({ filterOptions, users, retentionSettings }: PageProps) {
    const [logs, setLogs] = useState<LogSummary[]>([]);
    const [summary, setSummary] = useState({ total: 0, errors: 0, warnings: 0, security_events: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [module, setModule] = useState('all');
    const [severity, setSeverity] = useState('all');
    const [status, setStatus] = useState('all');
    const [userId, setUserId] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sort, setSort] = useState<'desc' | 'asc'>('desc');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState<LogDetail | null>(null);

    const [retention, setRetention] = useState(retentionSettings);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);
    const [purging, setPurging] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/admin/api/system-logs', {
                params: {
                    page,
                    per_page: 25,
                    search: debouncedSearch || undefined,
                    module: module !== 'all' ? module : undefined,
                    severity: severity !== 'all' ? severity : undefined,
                    status: status !== 'all' ? status : undefined,
                    user_id: userId !== 'all' ? userId : undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                    sort,
                },
            });

            setLogs(data.logs.data);
            setLastPage(data.logs.last_page);
            setSummary(data.summary);
        } catch {
            toast.error('Failed to load system logs.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, module, severity, status, userId, dateFrom, dateTo, sort]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, module, severity, status, userId, dateFrom, dateTo, sort]);

    const openDetail = async (id: number) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setSelectedLog(null);

        try {
            const { data } = await axios.get<LogDetail>(`/admin/api/system-logs/${id}`);
            setSelectedLog(data);
        } catch {
            toast.error('Failed to load log details.');
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const buildExportParams = () => ({
        search: debouncedSearch || undefined,
        module: module !== 'all' ? module : undefined,
        severity: severity !== 'all' ? severity : undefined,
        status: status !== 'all' ? status : undefined,
        user_id: userId !== 'all' ? userId : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    });

    const fetchExportData = async () => {
        const { data } = await axios.get('/admin/api/system-logs/export', {
            params: buildExportParams(),
        });
        return data.logs as LogDetail[];
    };

    const exportExcel = async () => {
        setExporting('excel');
        try {
            const rows = await fetchExportData();
            const sheet = XLSX.utils.json_to_sheet(
                rows.map((log) => ({
                    Date: log.created_at_formatted,
                    Event: log.event_type,
                    Module: log.module,
                    Severity: log.severity,
                    Status: log.status,
                    Description: log.description,
                    User: log.user_name,
                    Role: log.user_role,
                    IP: log.ip_address,
                })),
            );
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, sheet, 'System Logs');
            XLSX.writeFile(workbook, `system-logs-${Date.now()}.xlsx`);
            toast.success('Logs exported to Excel.');
        } catch {
            toast.error('Export failed.');
        } finally {
            setExporting(null);
        }
    };

    const exportCsv = async () => {
        setExporting('csv');
        try {
            const rows = await fetchExportData();
            const sheet = XLSX.utils.json_to_sheet(
                rows.map((log) => ({
                    Date: log.created_at_formatted,
                    Event: log.event_type,
                    Module: log.module,
                    Severity: log.severity,
                    Status: log.status,
                    Description: log.description,
                    User: log.user_name,
                    Role: log.user_role,
                    IP: log.ip_address,
                })),
            );
            XLSX.writeFile(
                { SheetNames: ['Logs'], Sheets: { Logs: sheet } },
                `system-logs-${Date.now()}.csv`,
            );
            toast.success('Logs exported to CSV.');
        } catch {
            toast.error('Export failed.');
        } finally {
            setExporting(null);
        }
    };

    const exportPdf = async () => {
        setExporting('pdf');
        try {
            const rows = await fetchExportData();
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.setFontSize(14);
            doc.text('System Audit Logs', 14, 15);
            doc.setFontSize(8);

            let y = 25;
            rows.slice(0, 100).forEach((log) => {
                const line = `${log.created_at_formatted} | ${log.severity} | ${log.event_type} | ${log.description}`;
                doc.text(line.substring(0, 120), 14, y);
                y += 5;
                if (y > 190) {
                    doc.addPage();
                    y = 15;
                }
            });

            doc.save(`system-logs-${Date.now()}.pdf`);
            toast.success('Logs exported to PDF.');
        } catch {
            toast.error('Export failed.');
        } finally {
            setExporting(null);
        }
    };

    const saveRetentionSettings = async () => {
        setSavingSettings(true);
        try {
            const { data } = await axios.put('/admin/api/system-logs/settings/retention', retention);
            setRetention(data.settings);
            toast.success('Retention settings saved.');
            setSettingsOpen(false);
        } catch {
            toast.error('Failed to save settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const purgeOldLogs = async () => {
        if (!confirm('Purge logs older than the retention period? This cannot be undone.')) {
            return;
        }

        setPurging(true);
        try {
            const { data } = await axios.post('/admin/api/system-logs/purge', {
                use_retention_policy: true,
            });
            toast.success(`Purged ${data.deleted_count} log entries.`);
            fetchLogs();
        } catch {
            toast.error('Purge failed.');
        } finally {
            setPurging(false);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setModule('all');
        setSeverity('all');
        setStatus('all');
        setUserId('all');
        setDateFrom('');
        setDateTo('');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Logs" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <ScrollText className="h-7 w-7" />
                            System Logs
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Monitor authentication, user actions, sales, and system events.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting !== null}>
                            {exporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportExcel} disabled={exporting !== null}>
                            {exporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                            Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting !== null}>
                            CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                            Retention
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Total Logs" value={summary.total} icon={<ScrollText className="text-muted-foreground h-4 w-4" />} loading={loading} />
                    <MetricCard title="Errors" value={summary.errors} icon={<AlertTriangle className="text-red-500 h-4 w-4" />} loading={loading} />
                    <MetricCard title="Warnings" value={summary.warnings} icon={<AlertTriangle className="text-amber-500 h-4 w-4" />} loading={loading} />
                    <MetricCard title="Security Events" value={summary.security_events} icon={<Shield className="text-blue-500 h-4 w-4" />} loading={loading} />
                </div>

                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Filters</CardTitle>
                        <CardDescription>Search and filter audit trail entries.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="relative lg:col-span-2">
                                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                                <Input
                                    placeholder="Search description, event, user..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={module} onValueChange={setModule}>
                                <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All modules</SelectItem>
                                    {filterOptions.modules.map((m) => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={severity} onValueChange={setSeverity}>
                                <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All severities</SelectItem>
                                    {filterOptions.severities.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {filterOptions.statuses.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={userId} onValueChange={setUserId}>
                                <SelectTrigger><SelectValue placeholder="User" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All users</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={String(user.id)}>
                                            {user.name} ({user.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
                            <Select value={sort} onValueChange={(v) => setSort(v as 'asc' | 'desc')}>
                                <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="desc">Newest first</SelectItem>
                                    <SelectItem value="asc">Oldest first</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Module</TableHead>
                                        <TableHead>Severity</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 8 }).map((_, i) => (
                                            <TableRow key={i}>
                                                {Array.from({ length: 8 }).map((__, j) => (
                                                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-muted-foreground py-12 text-center">
                                                No log entries match your filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap text-sm">{log.created_at_formatted}</TableCell>
                                                <TableCell className="font-mono text-xs">{log.event_type}</TableCell>
                                                <TableCell><Badge variant="secondary">{log.module}</Badge></TableCell>
                                                <TableCell>{severityBadge(log.severity)}</TableCell>
                                                <TableCell>{statusBadge(log.status)}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{log.user_name ?? 'System'}</div>
                                                    {log.user_role && (
                                                        <div className="text-muted-foreground text-xs">{log.user_role}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => openDetail(log.id)}>
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
                                <p className="text-muted-foreground text-sm">Page {page} of {lastPage}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                        <ChevronLeft className="h-4 w-4" /> Previous
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                                        Next <ChevronRight className="h-4 w-4" />
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
                        <DialogTitle>Log Entry Details</DialogTitle>
                        <DialogDescription>{selectedLog?.event_type ?? 'Loading...'}</DialogDescription>
                    </DialogHeader>

                    {detailLoading || !selectedLog ? (
                        <div className="space-y-3 py-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-4 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div><span className="text-muted-foreground">Date</span><p className="font-medium">{selectedLog.created_at_formatted}</p></div>
                                <div><span className="text-muted-foreground">User</span><p className="font-medium">{selectedLog.user_name ?? 'System'}</p></div>
                                <div><span className="text-muted-foreground">Role</span><p className="font-medium">{selectedLog.user_role ?? '—'}</p></div>
                                <div><span className="text-muted-foreground">IP Address</span><p className="font-medium">{selectedLog.ip_address ?? '—'}</p></div>
                                <div><span className="text-muted-foreground">Browser</span><p className="font-medium">{selectedLog.browser ?? '—'}</p></div>
                                <div><span className="text-muted-foreground">Device</span><p className="font-medium">{selectedLog.device ?? '—'}</p></div>
                                <div><span className="text-muted-foreground">Module</span><p className="font-medium">{selectedLog.module}</p></div>
                                <div className="flex gap-2"><span className="text-muted-foreground">Severity</span>{severityBadge(selectedLog.severity)}</div>
                            </div>

                            <div>
                                <span className="text-muted-foreground">Description</span>
                                <p className="font-medium">{selectedLog.description}</p>
                            </div>

                            {selectedLog.old_values && (
                                <div>
                                    <span className="text-muted-foreground">Previous Values</span>
                                    <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">{JSON.stringify(selectedLog.old_values, null, 2)}</pre>
                                </div>
                            )}

                            {selectedLog.new_values && (
                                <div>
                                    <span className="text-muted-foreground">New Values</span>
                                    <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">{JSON.stringify(selectedLog.new_values, null, 2)}</pre>
                                </div>
                            )}

                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <span className="text-muted-foreground">Metadata</span>
                                    <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                                </div>
                            )}

                            {selectedLog.user_agent && (
                                <div>
                                    <span className="text-muted-foreground">User Agent</span>
                                    <p className="text-muted-foreground mt-1 break-all text-xs">{selectedLog.user_agent}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Log Retention Policy</DialogTitle>
                        <DialogDescription>Configure automatic purging of old audit logs.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="retention-days">Retention period (days)</Label>
                            <Input
                                id="retention-days"
                                type="number"
                                min={7}
                                max={3650}
                                value={retention.retention_days}
                                onChange={(e) => setRetention({ ...retention, retention_days: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="auto-purge">Auto-purge enabled</Label>
                            <Switch
                                id="auto-purge"
                                checked={retention.auto_purge_enabled}
                                onCheckedChange={(checked) => setRetention({ ...retention, auto_purge_enabled: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button variant="destructive" onClick={purgeOldLogs} disabled={purging}>
                            {purging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Purge Now
                        </Button>
                        <Button onClick={saveRetentionSettings} disabled={savingSettings}>
                            {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Settings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
