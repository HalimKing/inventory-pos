import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';
import {
    ArrowUpDown,
    Building,
    ChevronDown,
    Filter,
    Globe,
    Mail,
    MapPin,
    MoreHorizontal,
    Phone,
    Plus,
    User,
    X,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, FlashMessages } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
// toast notifications
import { DialogTrigger } from '@radix-ui/react-dialog';
import { Bounce, toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';

export type Supplier = {
    id: string;
    companyName: string;
    email: string;
    phone: string;
    address: string;
    contactPerson?: string;
    status: 'active' | 'inactive';
    lastOrderDate?: Date;
};

type FormData = {
    companyName: string;
    email: string;
    phone: string;
    address: string;
    contactPerson?: string;
    status: 'active' | 'inactive';
};

type EditFormData = FormData & {
    id: string;
};

export const supplierColumns: ColumnDef<Supplier>[] = [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                }
                onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'companyName',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Supplier Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => (
            <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <div className="font-medium">
                        {row.getValue('companyName')}
                    </div>
                    {row.original.contactPerson && (
                        <div className="text-sm text-muted-foreground">
                            Contact: {row.original.contactPerson}
                        </div>
                    )}
                </div>
            </div>
        ),
    },
    {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
            <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                    href={`mailto:${row.getValue('email')}`}
                    className="hover:text-primary hover:underline"
                >
                    {row.getValue('email')}
                </a>
            </div>
        ),
    },
    {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
            <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                    href={`tel:${row.getValue('phone')}`}
                    className="hover:text-primary hover:underline"
                >
                    {row.getValue('phone')}
                </a>
            </div>
        ),
    },
    {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ row }) => (
            <div className="flex max-w-[200px] items-start space-x-2 text-wrap">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{row.getValue('address')}</span>
            </div>
        ),
    },

    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as string;
            const getStatusVariant = (status: string) => {
                switch (status) {
                    case 'active':
                        return 'default';
                    case 'inactive':
                        return 'secondary';
                    default:
                        return 'default';
                }
            };

            const getStatusColor = (status: string) => {
                switch (status) {
                    case 'active':
                        return 'text-green-600';
                    case 'inactive':
                        return 'text-red-600';
                    default:
                        return 'text-gray-600';
                }
            };

            return (
                <div className="flex items-center space-x-2">
                    <div
                        className={`h-2 w-2 rounded-full ${getStatusColor(status)}`}
                    />
                    <Badge variant={getStatusVariant(status)}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                </div>
            );
        },
        filterFn: (row, columnId, filterValue) => {
            if (filterValue === 'all') return true;
            return row.getValue(columnId) === filterValue;
        },
    },

    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
            const supplier = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => {
                                window.dispatchEvent(
                                    new CustomEvent('viewSupplier', {
                                        detail: supplier,
                                    }),
                                );
                            }}
                        >
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                window.dispatchEvent(
                                    new CustomEvent('editSupplier', {
                                        detail: supplier,
                                    }),
                                );
                            }}
                        >
                            Edit Supplier
                        </DropdownMenuItem>
                        {/* update status */}
                        <DropdownMenuItem
                            onClick={() => {
                                window.dispatchEvent(
                                    new CustomEvent('statusChange', {
                                        detail: supplier,
                                    }),
                                );
                            }}
                            className={
                                supplier.status === 'active'
                                    ? 'text-red-600'
                                    : 'text-green-600'
                            }
                        >
                            {supplier.status === 'active'
                                ? 'Deactivate Supplier'
                                : 'Activate Supplier'}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                                window.dispatchEvent(
                                    new CustomEvent('deleteSupplier', {
                                        detail: supplier,
                                    }),
                                );
                            }}
                        >
                            Delete Supplier
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

const SupplierIndexPage = ({
    suppliersData,
}: {
    suppliersData: Supplier[];
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [isEditSupplierOpen, setIsEditSupplierOpen] = React.useState(false);
    const [isAddSupplierOpen, setIsAddSupplierOpen] = React.useState(false);
    const [isViewSupplierOpen, setIsViewSupplierOpen] = React.useState(false);
    const [suppliers, setSuppliers] = React.useState<Supplier[]>(suppliersData);
    const [editingSupplier, setEditingSupplier] =
        React.useState<Supplier | null>(null);
    const [viewingSupplier, setViewingSupplier] =
        React.useState<Supplier | null>(null);
    const { flash } = usePage().props as { flash?: FlashMessages };

    const { data, setData, post, processing, errors } = useForm<FormData>({
        companyName: '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
        contactPerson: '',
    });

    const {
        data: editData,
        setData: setEditData,
        put,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEditForm,
    } = useForm<EditFormData>({
        id: '',
        companyName: '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
        contactPerson: '',
    });

    const table = useReactTable({
        data: suppliers,
        columns: supplierColumns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    // Calculate summary statistics
    const summary = React.useMemo(() => {
        return suppliers.reduce(
            (acc, supplier) => {
                acc.totalSuppliers += 1;
                if (supplier.status === 'active') acc.activeSuppliers += 1;
                if (supplier.status === 'inactive') acc.inactiveSuppliers += 1;
                return acc;
            },
            {
                totalSuppliers: 0,
                activeSuppliers: 0,
                inactiveSuppliers: 0,
            },
        );
    }, [suppliers]);

    const getActiveFiltersCount = () => {
        return columnFilters.filter(
            (filter) =>
                filter.value &&
                (Array.isArray(filter.value)
                    ? filter.value.length > 0
                    : filter.value !== ''),
        ).length;
    };

    const clearAllFilters = () => {
        setColumnFilters([]);
    };

    React.useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash?.success]);

    // Handle view events from dropdown
    React.useEffect(() => {
        const handleViewEvent = (event: CustomEvent) => {
            openViewDialog(event.detail);
        };

        const handleEditEvent = (event: CustomEvent) => {
            openEditDialog(event.detail);
        };

        // delete
        const handleDeleteEvent = (event: CustomEvent) => {
            handleDeleteSupplier(event.detail);
        };

        // handle status change
        const handleStatusChangeEvent = (event: CustomEvent) => {
            handleStatusChange(event.detail);
        };

        window.addEventListener(
            'viewSupplier',
            handleViewEvent as EventListener,
        );
        window.addEventListener(
            'editSupplier',
            handleEditEvent as EventListener,
        );
        window.addEventListener(
            'deleteSupplier',
            handleDeleteEvent as EventListener,
        );
        window.addEventListener(
            'statusChange',
            handleStatusChangeEvent as EventListener,
        );

        return () => {
            window.removeEventListener(
                'viewSupplier',
                handleViewEvent as EventListener,
            );
            window.removeEventListener(
                'editSupplier',
                handleEditEvent as EventListener,
            );
            window.removeEventListener(
                'deleteSupplier',
                handleDeleteEvent as EventListener,
            );
            window.removeEventListener(
                'statusChange',
                handleStatusChangeEvent as EventListener,
            );
        };
    }, []);

    // Save supplier
    const handleAddSupplier = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post('/admin/suppliers', {
            onSuccess: () => {
                setIsAddSupplierOpen(false);
                fetchSuppliers();
            },
            onError: (errors) => {
                console.log(errors);
            },
        });
    };

    // Edit supplier
    const handleEditSupplier = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingSupplier) return;

        put(`/admin/suppliers/${editingSupplier.id}`, {
            onSuccess: () => {
                fetchSuppliers();
                setIsEditSupplierOpen(false);
                setEditingSupplier(null);
                resetEditForm();
            },
            onError: (errors) => {
                console.log(errors);
            },
        });
    };

    // handle delete
    const handleDeleteSupplier = async (supplier: Supplier) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the supplier "${supplier.contactPerson}". This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            customClass: {
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel',
            },
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/admin/suppliers/${supplier.id}`);

                // Refresh categories data after successful deletion
                await fetchSuppliers();

                toast.success(`The supplier has been deleted successfully.`);
            } catch (error: any) {
                console.error('Error deleting supplier:', error);
                const message =
                    error?.response?.data?.error || 'Failed to delete supplier';
                toast.error(message);
            }
        }
    };

    // handle status updates
    const handleStatusChange = async (supplier: Supplier) => {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: `You are sure you want to update the status of the supplier "${supplier.contactPerson}".`,
                icon: 'info',
                showCancelButton: true,
                // primary color for the confrimation
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, Continue',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                customClass: {
                    confirmButton: 'swal2-confirm',
                    cancelButton: 'swal2-cancel',
                },
            });

            if (!result.isConfirmed) return;

            // Update supplier status
            router.get(`/admin/suppliers/${supplier.id}/status`, {
                status: supplier.status === 'active' ? 'inactive' : 'active',
            });

            // Refresh categories data after successful deletion
            await fetchSuppliers();

            toast.success(`The supplier has been updated successfully.`);
        } catch (error) {
            console.error('Error updating supplier status:', error);
            toast.error('Failed to update supplier status');
        }
    };

    const openEditDialog = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setEditData({
            id: supplier.id,
            companyName: supplier.companyName,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            contactPerson: supplier.contactPerson || '',
            status: supplier.status as 'active' | 'inactive',
        });
        setIsEditSupplierOpen(true);
    };

    const openViewDialog = (supplier: Supplier) => {
        setViewingSupplier(supplier);
        setIsViewSupplierOpen(true);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setData({
            ...data,
            [name]: value,
        });
    };

    const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setEditData({
            ...editData,
            [name]: value,
        });
    };

    const fetchSuppliers = async () => {
        try {
            const response = await axios.get(
                '/admin/suppliers/fetch-suppliers',
            );
            const allSuppliers = response.data;

            if (Array.isArray(allSuppliers)) {
                setSuppliers(allSuppliers);
            } else {
                console.error('Expected array but got:', allSuppliers);
                toast.error('Invalid data format received');
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            toast.error('Failed to load suppliers');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'inactive':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatDate = (date: Date | undefined) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="w-full px-10">
            {/* Header with Add Supplier Button */}
            <div className="flex items-center justify-between py-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Supplier Management
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your suppliers, contact information, and track
                        performance
                    </p>
                </div>

                <Dialog
                    open={isAddSupplierOpen}
                    onOpenChange={setIsAddSupplierOpen}
                >
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Supplier
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px]">
                        <DialogHeader>
                            <DialogTitle>Add New Supplier</DialogTitle>
                            <DialogDescription>
                                Add a new supplier to your vendor list. Fill in
                                the details below.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleAddSupplier}
                            className="space-y-6"
                        >
                            <div className="space-y-6 py-2">
                                {/* Company Name */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="companyName"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Company Name
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="companyName"
                                                name="companyName"
                                                placeholder="Supplier company name"
                                                onChange={handleChange}
                                            />
                                            {errors.companyName && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {errors.companyName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Person */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="contactPerson"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Contact Person
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="contactPerson"
                                                name="contactPerson"
                                                placeholder="Primary contact name"
                                                onChange={handleChange}
                                            />
                                            {errors.contactPerson && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {errors.contactPerson}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="email"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Email
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="supplier@company.com"
                                                onChange={handleChange}
                                            />
                                            {errors.email && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {errors.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="phone"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Phone
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="phone"
                                                name="phone"
                                                placeholder="+1 (555) 123-4567"
                                                onChange={handleChange}
                                            />
                                            {errors.phone && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {errors.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="address"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Address
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="address"
                                                name="address"
                                                placeholder="Full business address"
                                                onChange={handleChange}
                                            />
                                            {errors.address && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {errors.address}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="status"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Status
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Select
                                                name="status"
                                                defaultValue="active"
                                                onValueChange={(value) =>
                                                    setData(
                                                        'status',
                                                        value as
                                                            | 'active'
                                                            | 'inactive',
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">
                                                        Active
                                                    </SelectItem>
                                                    <SelectItem value="inactive">
                                                        Inactive
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.status && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {errors.status}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="border-t border-gray-200 pt-4">
                                <Button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 hover:shadow-md"
                                >
                                    Add Supplier
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Supplier Dialog */}
                <Dialog
                    open={isEditSupplierOpen}
                    onOpenChange={setIsEditSupplierOpen}
                >
                    <DialogContent className="sm:max-w-[550px]">
                        <DialogHeader>
                            <DialogTitle>Edit Supplier</DialogTitle>
                            <DialogDescription>
                                Update the supplier information below.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleEditSupplier}
                            className="space-y-6"
                        >
                            <div className="space-y-6 py-2">
                                {/* Company Name */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="edit-companyName"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Company Name
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="edit-companyName"
                                                name="companyName"
                                                value={editData.companyName}
                                                placeholder="Supplier company name"
                                                onChange={handleEditChange}
                                            />
                                            {editErrors.companyName && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {editErrors.companyName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Person */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="edit-contactPerson"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Contact Person
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="edit-contactPerson"
                                                name="contactPerson"
                                                value={editData.contactPerson}
                                                placeholder="Primary contact name"
                                                onChange={handleEditChange}
                                            />
                                            {editErrors.contactPerson && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {editErrors.contactPerson}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="edit-email"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Email
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="edit-email"
                                                name="email"
                                                type="email"
                                                value={editData.email}
                                                placeholder="supplier@company.com"
                                                onChange={handleEditChange}
                                            />
                                            {editErrors.email && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {editErrors.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="edit-phone"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Phone
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="edit-phone"
                                                name="phone"
                                                value={editData.phone}
                                                placeholder="+1 (555) 123-4567"
                                                onChange={handleEditChange}
                                            />
                                            {editErrors.phone && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {editErrors.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="edit-address"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Address
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Input
                                                id="edit-address"
                                                name="address"
                                                value={editData.address}
                                                placeholder="Full business address"
                                                onChange={handleEditChange}
                                            />
                                            {editErrors.address && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {editErrors.address}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label
                                            htmlFor="edit-status"
                                            className="pt-2 text-right font-medium text-gray-700"
                                        >
                                            Status
                                        </Label>
                                        <div className="col-span-3 space-y-1">
                                            <Select
                                                value={editData.status}
                                                onValueChange={(value) =>
                                                    setEditData(
                                                        'status',
                                                        value as
                                                            | 'active'
                                                            | 'inactive',
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">
                                                        Active
                                                    </SelectItem>
                                                    <SelectItem value="inactive">
                                                        Inactive
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {editErrors.status && (
                                                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                    {editErrors.status}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="border-t border-gray-200 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditSupplierOpen(false)}
                                    className="mr-2"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 hover:shadow-md"
                                >
                                    Update Supplier
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* View Supplier Details Dialog */}
                <Dialog
                    open={isViewSupplierOpen}
                    onOpenChange={setIsViewSupplierOpen}
                >
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Supplier Details</DialogTitle>
                            <DialogDescription>
                                Complete information about the supplier
                            </DialogDescription>
                        </DialogHeader>

                        {viewingSupplier && (
                            <div className="space-y-6">
                                {/* Header with Company Info */}
                                <div className="flex items-start space-x-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                        <Building className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold">
                                            {viewingSupplier.companyName}
                                        </h3>
                                        <div
                                            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(viewingSupplier.status)}`}
                                        >
                                            {viewingSupplier.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                viewingSupplier.status.slice(1)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Contact Information */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                                                <User className="h-4 w-4" />
                                                <span>Contact Information</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {viewingSupplier.contactPerson && (
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        Contact Person
                                                    </p>
                                                    <p className="text-sm">
                                                        {
                                                            viewingSupplier.contactPerson
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    Email
                                                </p>
                                                <a
                                                    href={`mailto:${viewingSupplier.email}`}
                                                    className="flex items-center space-x-1 text-sm hover:text-primary hover:underline"
                                                >
                                                    <Mail className="h-3 w-3" />
                                                    <span>
                                                        {viewingSupplier.email}
                                                    </span>
                                                </a>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    Phone
                                                </p>
                                                <a
                                                    href={`tel:${viewingSupplier.phone}`}
                                                    className="flex items-center space-x-1 text-sm hover:text-primary hover:underline"
                                                >
                                                    <Phone className="h-3 w-3" />
                                                    <span>
                                                        {viewingSupplier.phone}
                                                    </span>
                                                </a>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Company Details */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                                                <Globe className="h-4 w-4" />
                                                <span>Company Details</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    Address
                                                </p>
                                                <p className="flex items-start space-x-1 text-sm">
                                                    <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                                                    <span>
                                                        {
                                                            viewingSupplier.address
                                                        }
                                                    </span>
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Quick Actions */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">
                                            Quick Actions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setIsViewSupplierOpen(
                                                        false,
                                                    );
                                                    openEditDialog(
                                                        viewingSupplier,
                                                    );
                                                }}
                                            >
                                                Edit Supplier
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    window.location.href = `mailto:${viewingSupplier.email}`;
                                                }}
                                            >
                                                Send Email
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    window.location.href = `tel:${viewingSupplier.phone}`;
                                                }}
                                            >
                                                Call Supplier
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <DialogFooter className="border-t border-gray-200 pt-4">
                            <Button
                                onClick={() => setIsViewSupplierOpen(false)}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rest of your existing JSX remains the same */}
            {/* Summary Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Suppliers
                        </CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.totalSuppliers}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All suppliers in system
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Suppliers
                        </CardTitle>
                        <div className="h-4 w-4 rounded-full bg-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {summary.activeSuppliers}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Currently active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Inactive Suppliers
                        </CardTitle>
                        <div className="h-4 w-4 rounded-full bg-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {summary.inactiveSuppliers}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Not currently active
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Section */}
            <div className="space-y-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                        {/* Supplier Name Search */}
                        <div className="w-full lg:max-w-sm">
                            <Input
                                placeholder="Search suppliers..."
                                value={
                                    (table
                                        .getColumn('companyName')
                                        ?.getFilterValue() as string) ?? ''
                                }
                                onChange={(event) =>
                                    table
                                        .getColumn('companyName')
                                        ?.setFilterValue(event.target.value)
                                }
                                className="w-full"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="w-full lg:max-w-[200px]">
                            <Select
                                value={
                                    (table
                                        .getColumn('status')
                                        ?.getFilterValue() as string) ?? 'all'
                                }
                                onValueChange={(value) =>
                                    table
                                        .getColumn('status')
                                        ?.setFilterValue(
                                            value === 'all' ? '' : value,
                                        )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex items-center gap-2">
                        {getActiveFiltersCount() > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearAllFilters}
                                className="h-9"
                            >
                                <X className="mr-1 h-4 w-4" />
                                Clear Filters ({getActiveFiltersCount()})
                            </Button>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto">
                                    <Filter className="mr-2 h-4 w-4" />
                                    Columns
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(
                                                        !!value,
                                                    )
                                                }
                                            >
                                                {column.id === 'name'
                                                    ? 'Supplier Name'
                                                    : column.id}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Active Filters Display */}
                {getActiveFiltersCount() > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {columnFilters.map((filter, index) => {
                            if (
                                !filter.value ||
                                (Array.isArray(filter.value) &&
                                    filter.value.length === 0)
                            )
                                return null;

                            return (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="px-3 py-1"
                                >
                                    {filter.id}:{' '}
                                    {Array.isArray(filter.value)
                                        ? filter.value.join(' - ')
                                        : filter.value.toString()}
                                    <button
                                        onClick={() => {
                                            setColumnFilters((prev) =>
                                                prev.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            );
                                        }}
                                        className="ml-2 hover:text-destructive"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && 'selected'
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={supplierColumns.length}
                                    className="h-24 text-center"
                                >
                                    No suppliers found. Try adjusting your
                                    filters or{' '}
                                    <Button
                                        variant="link"
                                        className="h-auto p-0"
                                        onClick={() =>
                                            setIsAddSupplierOpen(true)
                                        }
                                    >
                                        add a new supplier
                                    </Button>
                                    .
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination and Selection Info */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{' '}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick={false}
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="dark"
                    transition={Bounce}
                />
            </div>
        </div>
    );
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Suppliers',
        href: '/suppliers',
    },
];

export default function Index({
    suppliersData,
}: {
    suppliersData: Supplier[];
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="py-8">
                <Head title="Supplier Management" />
                <SupplierIndexPage suppliersData={suppliersData} />
            </div>
        </AppLayout>
    );
}
