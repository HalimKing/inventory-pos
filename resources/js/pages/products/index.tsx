// [file name]: use client.txt
// [file content begin]
'use client';

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
    Barcode,
    ChevronDown,
    Download,
    Filter,
    MoreHorizontal,
    Plus,
    ShoppingCart,
    TrendingUp,
    Upload,
    X,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Switch } from '@/components/ui/switch';
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
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
// toast notifications
import { Bounce, toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// ... (Product Type and frameworkOptions are unchanged)
export type Product = {
    id: string;
    name: string;
    barcode?: string | null;
    category: string; // Assuming category is a string for display but a number for form submission
    totalQuantity: number;
    quantityLeft: number;
    quantitySold: number;
    expiryDate: Date | string | null;
    status:
        | 'in-stock'
        | 'low-stock'
        | 'out-of-stock'
        | 'expired'
        | 'near-expiry';
    sellingPrice: number;
    initialAmount: number;
    profit: number;
    unitProfit?: number;
    image?: string; // Added image field
    reorderLevel?: number;
    hasExpiry: boolean;
    trackBatch: boolean;
    trackSerial: boolean;
    stockMode: 'batch' | 'inventory';
    batchCount?: number;
    batches?: Array<{
        id: number;
        batchNumber: string;
        quantity: number;
        expiryDate: string | null;
    }>;
    // Add category_id and supplier_id for form use (Inertia/Laravel convention)
    category_id: number; // Assuming an ID exists for the Combobox
    supplier_id: number; // Assuming an ID exists for the Combobox
};

interface FormData {
    name: string;
    barcode: string;
    category: number;
    supplier: number;
    costPrice: number;
    sellingPrice: number;
    totalQuantity: number;
    image: File | null;
    expiryDate: string;
    reorderLevel?: number;
    hasExpiry: boolean;
    trackBatch: boolean;
    trackSerial: boolean;
    _method?: 'PUT'; // For Inertia PUT request
}

interface BatchFormData {
    batchNumber: string;
    quantity: number;
    expiryDate: string;
}

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
    }).format(amount);
};

const resolveImageUrl = (imagePath?: string | null) => {
    if (!imagePath) {
        return '';
    }

    if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('/')) {
        return imagePath;
    }

    return `/storage/${imagePath.replace(/^\/+/, '')}`;
};

// **UPDATED COLUMNS TO USE NEW HANDLERS**
export const createColumns = (
    handleView: (product: Product) => void,
    handleEdit: (product: Product) => void,
    handleDelete: (product: Product) => void, // Added delete handler
): ColumnDef<Product>[] => [
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
        accessorKey: 'image',
        header: 'Image',
        cell: ({ row }) => {
            const imageUrl = row.getValue('image') as string;
            const resolvedImageUrl = resolveImageUrl(imageUrl);
            return (
                <div className="h-10 w-10 overflow-hidden rounded-md border">
                    {resolvedImageUrl ? (
                        <img
                            src={resolvedImageUrl}
                            alt="Product"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                    )}
                </div>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: 'name',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Product Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue('name')}</div>
        ),
    },
    {
        accessorKey: 'category',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Category
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => <div>{row.getValue('category')}</div>,
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as string;
            const getStatusVariant = (status: string) => {
                switch (status) {
                    case 'in-stock':
                        return 'default';
                    case 'low-stock':
                        return 'secondary';
                    case 'near-expiry':
                        return 'secondary';
                    case 'out-of-stock':
                        return 'destructive';
                    case 'expired':
                        return 'destructive';
                    default:
                        return 'default';
                }
            };

            return (
                <Badge variant={getStatusVariant(status)}>
                    {status
                        .split('-')
                        .map(
                            (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(' ')}
                </Badge>
            );
        },
        filterFn: (row, columnId, filterValue) => {
            if (filterValue === 'all') return true;
            return row.getValue(columnId) === filterValue;
        },
    },
    {
        accessorFn: (row) => (row.hasExpiry ? 'perishable' : 'non-perishable'),
        id: 'inventoryType',
        header: 'Inventory Type',
        cell: ({ row }) => {
            const inventoryType = row.getValue('inventoryType') as string;
            return (
                <Badge variant="outline" className="capitalize">
                    {inventoryType}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'totalQuantity',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Total Quantity
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const quantity = parseInt(row.getValue('totalQuantity'));
            return <div className="text-center">{quantity}</div>;
        },
    },
    {
        accessorKey: 'quantityLeft',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Quantity Left
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const quantity = parseInt(row.getValue('quantityLeft'));
            let className = 'text-center';
            if (quantity === 0) {
                className += ' text-red-600 font-medium';
            } else if (quantity < 20) {
                className += ' text-orange-600 font-medium';
            }
            return <div className={className}>{quantity}</div>;
        },
    },
    {
        accessorKey: 'quantitySold',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Quantity Sold
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const quantity = parseInt(row.getValue('quantitySold'));
            return <div className="text-center">{quantity}</div>;
        },
    },
    {
        accessorKey: 'sellingPrice',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Selling Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('sellingPrice'));
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'GHS',
            }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: 'initialAmount',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Cost Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('initialAmount'));
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'GHS',
            }).format(amount);
            return (
                <div className="text-right text-muted-foreground">
                    {formatted}
                </div>
            );
        },
    },
    {
        accessorKey: 'unitProfit',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Unit Profit
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const profit = parseFloat(row.getValue('unitProfit'));
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'GHS',
            }).format(profit);

            const isPositive = profit >= 0;
            const className = `text-right font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
            }`;

            return (
                <div className={className}>
                    {isPositive ? '+' : ''}
                    {formatted}
                </div>
            );
        },
    },
    {
        accessorKey: 'profit',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Total Profit
                    <TrendingUp className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const profit = parseFloat(row.getValue('profit'));
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'GHS',
            }).format(profit);

            const isPositive = profit >= 0;
            const className = `text-right font-bold ${
                isPositive ? 'text-green-600' : 'text-red-600'
            }`;

            return (
                <div className={className}>
                    {isPositive ? '+' : ''}
                    {formatted}
                </div>
            );
        },
    },
    {
        accessorKey: 'expiryDate',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Expiry Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const rawExpiryDate = row.getValue('expiryDate');
            const hasExpiry = row.original.hasExpiry;

            if (!hasExpiry || !rawExpiryDate) {
                return <div className="text-muted-foreground">Not tracked</div>;
            }

            const date = new Date(rawExpiryDate as string);

            if (isNaN(date.getTime())) {
                return <div className="text-muted-foreground">Not set</div>;
            }

            const formatted = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });

            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            let className = '';
            if (date < today) {
                className = 'text-red-600 font-medium';
            } else if (date <= thirtyDaysFromNow) {
                className = 'text-orange-600 font-medium';
            }

            return <div className={className}>{formatted}</div>;
        },
    },
    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
            const product = row.original;

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
                            onClick={() => handleView(product)} // **ADDED VIEW HANDLER**
                        >
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleEdit(product)} // **ADDED EDIT HANDLER**
                        >
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(product)} // **UPDATED DELETE HANDLER**
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

const ProducIndexPage = ({ productData }: { productData: Product[] }) => {
    console.log('Received product data:', productData);
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);

    // **NEW STATES FOR VIEW/EDIT DIALOGS**
    const [isViewProductOpen, setIsViewProductOpen] = React.useState(false);
    const [isEditProductOpen, setIsEditProductOpen] = React.useState(false);
    const [selectedProduct, setSelectedProduct] =
        React.useState<Product | null>(null);
    const [isBatchDialogOpen, setIsBatchDialogOpen] = React.useState(false);
    const [isBatchSaving, setIsBatchSaving] = React.useState(false);
    const [editingBatchId, setEditingBatchId] = React.useState<number | null>(
        null,
    );
    const [batchForm, setBatchForm] = React.useState<BatchFormData>({
        batchNumber: '',
        quantity: 0,
        expiryDate: '',
    });

    // **NEW STATES FOR EXCEL UPLOAD**
    const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
    const [uploadFile, setUploadFile] = React.useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [isUploading, setIsUploading] = React.useState(false);

    const [products, setProducts] = React.useState<Product[]>(productData);
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = React.useState<number>(0);
    const [selectedSupplier, setSelectedSupplier] = React.useState<
        number | null
    >(null);
    const [categoryOptions, setCategoryOptions] = React.useState<
        ComboboxOption[] | any
    >([]);
    const [supplierOptions, setSupplierOptions] = React.useState<
        ComboboxOption[] | any
    >([]);
    const { flash } = usePage().props as { flash?: FlashMessages };

    const generateBarcodeValue = () => {
        const randomDigits = Math.floor(100 + Math.random() * 900);
        return `BC-${Date.now().toString().slice(-7)}${randomDigits}`;
    };

    const printBarcodeLabel = (product: Product) => {
        if (!product.barcode) {
            toast.error('This product has no barcode to print.');
            return;
        }

        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            toast.error('Unable to open print window.');
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Barcode Label</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; }
                        .label { border: 1px solid #000; width: 280px; padding: 14px; }
                        .name { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
                        .barcode { font-family: 'Courier New', monospace; font-size: 22px; letter-spacing: 2px; margin-bottom: 6px; }
                        .value { font-size: 12px; color: #333; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="name">${product.name}</div>
                        <div class="barcode">*${product.barcode}*</div>
                        <div class="value">${product.barcode}</div>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Form for ADDING a new product
    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset: resetAddForm,
    } = useForm<FormData>({
        name: '',
        barcode: '',
        category: 0,
        supplier: 0,
        sellingPrice: 0,
        costPrice: 0,
        totalQuantity: 0,
        image: null,
        expiryDate: '',
        reorderLevel: 0,
        hasExpiry: false,
        trackBatch: false,
        trackSerial: false,
    });

    // **NEW Form for EDITING an existing product**
    const {
        data: editData,
        setData: setEditData,
        post: put, // Use post for Inertia's PUT method
        processing: editProcessing,
        errors: editErrors,
        reset: resetEditForm,
    } = useForm<FormData>({
        name: '',
        barcode: '',
        category: 0,
        supplier: 0,
        sellingPrice: 0,
        costPrice: 0,
        totalQuantity: 0,
        image: null,
        expiryDate: '',
        reorderLevel: 0,
        hasExpiry: false,
        trackBatch: false,
        trackSerial: false,
        _method: 'PUT', // Set the method for the PUT request
    });

    // **NEW: Handler to open the View dialog**
    const handleViewProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsViewProductOpen(true);
    };

    // **NEW: Handler to open the Edit dialog and populate form**
    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        // Populate the edit form with the product data
        setEditData({
            name: product.name,
            barcode: product.barcode ?? '',
            category: product.category_id,
            supplier: product.supplier_id,
            sellingPrice: product.sellingPrice,
            costPrice: product.initialAmount, // initialAmount is Cost Price
            totalQuantity: product.totalQuantity,
            image: null,
            expiryDate: product.expiryDate
                ? new Date(product.expiryDate).toISOString().split('T')[0]
                : '',
            reorderLevel: product.reorderLevel ?? 0,
            hasExpiry: product.hasExpiry,
            trackBatch: product.trackBatch,
            trackSerial: product.trackSerial,
            _method: 'PUT',
        });
        // Set initial image preview
        if (product.image) {
            setImagePreview(product.image);
        }

        // Fetch categories and suppliers
        fetchAllCategories();
        fetchAllSuppliers();

        setIsEditProductOpen(true);
    };

    // **NEW: Handler to delete product with SweetAlert2 confirmation**
    const handleDeleteProduct = async (product: Product) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete "${product.name}". This action cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            background: '#fff',
            iconColor: '#ef4444',
        });

        if (result.isConfirmed) {
            try {
                const response = await axios.delete(
                    `/admin/products/${product.id}`,
                );

                if (response.status === 200) {
                    // Remove product from local state
                    setProducts((prev) =>
                        prev.filter((p) => p.id !== product.id),
                    );

                    toast.success(
                        `"${product.name}" has been deleted successfully!`,
                    );

                    Swal.fire({
                        title: 'Deleted!',
                        text: `"${product.name}" has been deleted.`,
                        icon: 'success',
                        confirmButtonColor: '#3085d6',
                        background: '#fff',
                        iconColor: '#10b981',
                    });
                }
            } catch (error: any) {
                console.error('Error deleting product:', error);

                let errorMessage =
                    'Failed to delete product. Please try again.';
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                }

                toast.error(errorMessage);

                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#3085d6',
                    background: '#fff',
                    iconColor: '#ef4444',
                });
            }
        }
    };

    const openAddBatchDialog = () => {
        setEditingBatchId(null);
        setBatchForm({
            batchNumber: '',
            quantity: 0,
            expiryDate: '',
        });
        setIsBatchDialogOpen(true);
    };

    const openEditBatchDialog = (batch: {
        id: number;
        batchNumber: string;
        quantity: number;
        expiryDate: string | null;
    }) => {
        setEditingBatchId(batch.id);
        setBatchForm({
            batchNumber: batch.batchNumber,
            quantity: batch.quantity,
            expiryDate: batch.expiryDate
                ? new Date(batch.expiryDate).toISOString().split('T')[0]
                : '',
        });
        setIsBatchDialogOpen(true);
    };

    const handleSaveBatch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedProduct) return;

        setIsBatchSaving(true);

        try {
            if (editingBatchId) {
                await axios.put(
                    `/admin/products/${selectedProduct.id}/batches/${editingBatchId}`,
                    batchForm,
                );
                toast.success('Batch updated successfully.');
            } else {
                await axios.post(
                    `/admin/products/${selectedProduct.id}/batches`,
                    batchForm,
                );
                toast.success('Batch added successfully.');
            }

            setIsBatchDialogOpen(false);
            setEditingBatchId(null);
            await fetchAllProducts();
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                'Failed to save batch. Please try again.';
            toast.error(message);
        } finally {
            setIsBatchSaving(false);
        }
    };

    const handleDeleteBatch = async (batchId: number) => {
        if (!selectedProduct) return;

        const result = await Swal.fire({
            title: 'Delete batch?',
            text: 'This batch row will be removed permanently.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Delete',
        });

        if (!result.isConfirmed) return;

        try {
            await axios.delete(
                `/admin/products/${selectedProduct.id}/batches/${batchId}`,
            );
            toast.success('Batch removed successfully.');
            await fetchAllProducts();
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                'Failed to delete batch. Please try again.';
            toast.error(message);
        }
    };

    // **NEW: Download CSV Template**
    const downloadCSVTemplate = () => {
        const templateData = [
            [
                'Product Name',
                'Barcode',
                'Category Name',
                'Supplier Email',
                'Selling Price',
                'Cost Price',
                'Total Quantity',
                'Reorder Level',
                'Expiry Date',
                'Has Expiry',
                'Track Batch',
                'Track Serial',
            ],
            [
                'Example Product',
                'BC-10024583',
                'Antacid',
                'example@mail.com',
                '100.00',
                '80.00',
                '50',
                '10',
                '2024-12-31',
                'true',
                'true',
                'false',
            ],
        ];

        const csvContent = templateData.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'product_import_template.csv');
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('CSV template downloaded successfully!');
    };

    // **NEW: Handle CSV file upload**
    const handleCSVUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!uploadFile) {
            toast.error('Please select a file to upload');
            return;
        }

        // Validate file type
        if (!uploadFile.name.endsWith('.csv')) {
            toast.error('Please upload a valid CSV file');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('csv_file', uploadFile);

            const response = await axios.post(
                '/admin/imports/products/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const progress =
                                (progressEvent.loaded / progressEvent.total) *
                                100;
                            setUploadProgress(Math.round(progress));
                        }
                    },
                },
            );

            if (response.status === 200) {
                console.log(response.data);

                toast.success('Products imported successfully!');
                setIsUploadDialogOpen(false);
                setUploadFile(null);
                setUploadProgress(0);

                // Refresh products list
                fetchAllProducts();
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);

            let errorMessage =
                'Failed to import products. Please check the file format.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                errorMessage = Object.values(errors).flat().join(', ');
            }

            toast.error(errorMessage);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Update the file input to accept CSV only
    {
        /* <Input
  id="csvFile"
  name="csvFile"
  type="file"
  accept=".csv"
  onChange={handleFileSelect}
  className="hidden"
/> */
    }

    // **NEW: Download Excel Template**
    const downloadExcelTemplate = () => {
        // Create template data
        const templateData = [
            {
                'Product Name': 'Example Product',
                Barcode: 'BC-10024583',
                'Category Name': 'Antacid',
                'Supplier Email': 'example@mail.com',
                'Selling Price': '100.00',
                'Cost Price': '80.00',
                'Total Quantity': '50',
                'Reorder Level': '10',
                'Expiry Date': '2024-12-31',
                'Has Expiry': 'true',
                'Track Batch': 'true',
                'Track Serial': 'false',
            },
        ];

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(templateData);

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products Template');

        // Generate and download file
        XLSX.writeFile(wb, 'product_import_template.xlsx');

        toast.success('Template downloaded successfully!');
    };

    // **NEW: Handle Excel file upload**
    const handleExcelUpload = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!uploadFile) {
            toast.error('Please select a file to upload');
            return;
        }

        // Validate file type
        if (
            !uploadFile.name.endsWith('.xlsx') &&
            !uploadFile.name.endsWith('.xls')
        ) {
            toast.error('Please upload a valid Excel file (.xlsx or .xls)');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('excel_file', uploadFile);

            const response = await axios.post(
                '/admin/imports/products/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const progress =
                                (progressEvent.loaded / progressEvent.total) *
                                100;
                            setUploadProgress(Math.round(progress));
                        }
                    },
                },
            );

            if (response.status === 200) {
                console.log(response.data);

                toast.success('Products imported successfully!');
                setIsUploadDialogOpen(false);
                setUploadFile(null);
                setUploadProgress(0);

                // Refresh products list
                fetchAllProducts();
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);

            let errorMessage =
                'Failed to import products. Please check the file format.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.errors) {
                // Handle validation errors from backend
                const errors = error.response.data.errors;
                errorMessage = Object.values(errors).flat().join(', ');
            }

            toast.error(errorMessage);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // **NEW: Handle file selection**
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadFile(file);
        }
    };

    // **NEW: Columns using the new handlers**
    const columns = React.useMemo(
        () =>
            createColumns(
                handleViewProduct,
                handleEditProduct,
                handleDeleteProduct,
            ),
        [products],
    );

    const table = useReactTable({
        data: products,
        columns,
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

    const categories = React.useMemo(() => {
        return Array.from(new Set(products.map((product) => product.category)));
    }, [products]);

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

    // **MODIFIED: Handle image file selection and preview for both ADD and EDIT**
    const handleImageChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        isEdit: boolean = false,
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            // Check file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid image file (JPG, JPEG, PNG)');
                event.target.value = ''; // Reset input
                setImagePreview(null);
                return;
            }

            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert(
                    'File size too large. Please select an image smaller than 5MB.',
                );
                event.target.value = ''; // Reset input
                setImagePreview(null);
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };

            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }

        // Set data in the correct form
        if (isEdit) {
            setEditData('image', file ?? null);
        } else {
            setData('image', file ?? null);
        }
    };

    const handleAddProduct = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post('/admin/products', {
            forceFormData: true, // Crucial for file uploads
            onSuccess: () => {
                setIsAddProductOpen(false);
                fetchAllProducts();
                resetAddForm();
            },
            onError: (errors) => {
                console.log(errors);
            },
        });
    };

    // **NEW: Handle form submission for EDITING a product**
    const handleEditProductSubmit = (event?: React.SyntheticEvent) => {
        event?.preventDefault();
        if (!selectedProduct) return;

        put(`/admin/products/${selectedProduct.id}`, {
            forceFormData: true, // Crucial for file uploads and PUT/PATCH with Inertia
            onSuccess: () => {
                setIsEditProductOpen(false);
                fetchAllProducts();
                resetEditForm();
                setSelectedProduct(null);
            },
            onError: (errors) => {
                console.log(errors);
            },
        });
    };

    // fetc products
    const fetchAllProducts = async () => {
        try {
            const response = await axios.get(
                '/admin/products/data/fetch/all-products',
            );
            const allProducts = response.data.map((product: any) => ({
                ...product,
                // Ensure correct type for the Combobox IDs if your backend returns them with different keys
                category_id: product.category_id || product.category,
                supplier_id: product.supplier_id || product.supplier,
                expiryDate: product.expiryDate
                    ? new Date(product.expiryDate)
                    : null,
            }));

            if (Array.isArray(allProducts)) {
                setProducts(allProducts);
                setSelectedProduct((previous) => {
                    if (!previous) return previous;

                    return (
                        allProducts.find(
                            (product: Product) => product.id === previous.id,
                        ) ?? previous
                    );
                });
            } else {
                console.error('Expected array but got:', allProducts);
                toast.error('Invalid data format received');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        }
    };

    // Reset preview when dialog closes
    React.useEffect(() => {
        if (!isAddProductOpen && !isEditProductOpen) {
            // Check both dialogs
            setImagePreview(null);
        } else if (isAddProductOpen || isEditProductOpen) {
            // Fetch categories/suppliers when either dialog opens
            fetchAllCategories();
            fetchAllSuppliers();
        }
    }, [isAddProductOpen, isEditProductOpen]);

    const fetchAllCategories = async () => {
        try {
            const response = await axios.get(
                '/admin/categories/data/fetch/all-categories',
            );
            const allCategories = response.data;

            if (Array.isArray(allCategories)) {
                setCategoryOptions(allCategories);
            } else {
                console.error('Expected array but got: ', allCategories);
            }
        } catch (error) {
            console.log('Error fetching categories:: ', error);
        }
    };
    const fetchAllSuppliers = async () => {
        try {
            const response = await axios.get(
                '/admin/suppliers/data/fetch/all-suppliers',
            );
            const allSuppliers = response.data;
            // console.log('Raw data', response);

            if (Array.isArray(allSuppliers)) {
                setSupplierOptions(allSuppliers);
            } else {
                console.error('Expected array but got: ', allSuppliers);
            }
        } catch (error) {
            console.log('Error fetching suppliers:: ', error);
        }
    };

    // Calculate totals for summary
    const totals = React.useMemo(() => {
        return products.reduce(
            (acc, product) => {
                acc.totalProfit += product.profit;
                acc.totalRevenue += product.sellingPrice * product.quantitySold;
                acc.totalCost += product.initialAmount * product.quantitySold;
                return acc;
            },
            { totalProfit: 0, totalRevenue: 0, totalCost: 0 },
        );
    }, [products]);

    return (
        <div className="w-full px-10 max-sm:px-6 lg:px-10">
            {/* Header with Add Product Button */}
            <div className="flex items-center justify-between py-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Product Inventory
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your products, inventory, and track profitability
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Download Template Button */}
                    <Button
                        variant="outline"
                        onClick={downloadCSVTemplate}
                        className="flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Template
                    </Button>

                    {/* Import Products Button */}
                    <Button
                        variant="outline"
                        onClick={() => setIsUploadDialogOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        Import
                    </Button>

                    {/* Delete Selected Button */}

                    {/* Add Product Dialog */}
                    <Dialog
                        open={isAddProductOpen}
                        onOpenChange={setIsAddProductOpen}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="h-full overflow-y-auto sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Add New Product</DialogTitle>
                                <DialogDescription>
                                    Add a new product to your inventory. Fill in
                                    the details below.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleAddProduct}
                                className="space-y-6"
                            >
                                <div className="space-y-6 py-2">
                                    <div className="grid gap-4 py-4">
                                        {/* Name Input */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="name"
                                                className="text-right"
                                            >
                                                Name
                                            </Label>
                                            <div className="col-span-3 space-y-1">
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    value={data.name}
                                                    placeholder="Product name"
                                                    className="col-span-3"
                                                    onChange={(e: any) =>
                                                        setData(
                                                            'name',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                {errors.name && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="barcode"
                                                className="text-right"
                                            >
                                                Barcode
                                            </Label>
                                            <div className="col-span-3 space-y-1">
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="barcode"
                                                        name="barcode"
                                                        value={data.barcode}
                                                        placeholder="Scan or type barcode"
                                                        className="col-span-3"
                                                        onChange={(e: any) =>
                                                            setData(
                                                                'barcode',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setData(
                                                                'barcode',
                                                                generateBarcodeValue(),
                                                            )
                                                        }
                                                    >
                                                        <Barcode className="mr-1 h-4 w-4" />
                                                        Generate
                                                    </Button>
                                                </div>
                                                {errors.barcode && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.barcode}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Category Combobox */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="category"
                                                className="text-right"
                                            >
                                                Category
                                            </Label>
                                            <div className="col-span-3 space-y-1">
                                                <Combobox
                                                    options={categoryOptions}
                                                    value={data.category}
                                                    onValueChange={(value) =>
                                                        setData(
                                                            'category',
                                                            value,
                                                        )
                                                    }
                                                    placeholder="Select category..."
                                                    searchPlaceholder="Search categories..."
                                                    emptyMessage="No category found."
                                                />
                                                {errors.category && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.category}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Supplier Combobox */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="supplier"
                                                className="text-right"
                                            >
                                                Supplier
                                            </Label>
                                            <div className="col-span-3 space-y-1">
                                                <Combobox
                                                    options={supplierOptions}
                                                    value={data.supplier}
                                                    onValueChange={(value) =>
                                                        setData(
                                                            'supplier',
                                                            value,
                                                        )
                                                    }
                                                    placeholder="Select supplier..."
                                                    searchPlaceholder="Search suppliers..."
                                                    emptyMessage="No supplier found."
                                                    className="w-full"
                                                />
                                                {errors.supplier && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.supplier}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Selling Price Input */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="sellingPrice"
                                                className="text-right"
                                            >
                                                Selling Price
                                            </Label>
                                            <div className="col-span-3 space-y-1">
                                                <Input
                                                    id="sellingPrice"
                                                    name="sellingPrice"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    className="col-span-3"
                                                    value={data.sellingPrice}
                                                    min="0"
                                                    max={99999.99}
                                                    onChange={(e: any) =>
                                                        setData(
                                                            'sellingPrice',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                {errors.sellingPrice && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.sellingPrice}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Cost Price Input */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="costPrice"
                                                className="text-right"
                                            >
                                                Cost Price
                                            </Label>
                                            <div className="col-span-3 space-y-1">
                                                <Input
                                                    id="costPrice"
                                                    name="costPrice"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    className="col-span-3"
                                                    min="0"
                                                    max={999999.99}
                                                    value={data.costPrice}
                                                    onChange={(e: any) =>
                                                        setData(
                                                            'costPrice',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                {errors.costPrice && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.costPrice}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Total Quantity Input */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="totalQuantity"
                                                className="text-right"
                                            >
                                                Total Qty
                                            </Label>
                                            <div className="col-span-3 space-y-1">
                                                <Input
                                                    id="totalQuantity"
                                                    name="totalQuantity"
                                                    type="number"
                                                    placeholder="100"
                                                    className="col-span-3"
                                                    min="0"
                                                    value={data.totalQuantity}
                                                    onChange={(e: any) =>
                                                        setData(
                                                            'totalQuantity',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                {errors.totalQuantity && (
                                                    <p className="text-red-600">
                                                        {errors.totalQuantity}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Tracking Configuration */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label className="pt-1 text-right">
                                                Tracking
                                            </Label>
                                            <div className="col-span-3 space-y-3">
                                                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            Track Expiry Date
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Enable for
                                                            perishable items.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={data.hasExpiry}
                                                        onCheckedChange={(
                                                            checked,
                                                        ) => {
                                                            setData(
                                                                'hasExpiry',
                                                                checked,
                                                            );
                                                            if (!checked) {
                                                                setData(
                                                                    'trackBatch',
                                                                    false,
                                                                );
                                                                setData(
                                                                    'expiryDate',
                                                                    '',
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            Track Batch
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Use FEFO and
                                                            lot-level stock.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={
                                                            data.trackBatch
                                                        }
                                                        disabled={
                                                            !data.hasExpiry
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            setData(
                                                                'trackBatch',
                                                                checked,
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            Track Serial Number
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Optional for
                                                            electronics and
                                                            high-value items.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={
                                                            data.trackSerial
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            setData(
                                                                'trackSerial',
                                                                checked,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Expiry Date Input */}
                                        {data.hasExpiry && (
                                            <div className="grid grid-cols-4 items-start gap-4">
                                                <Label
                                                    htmlFor="expiryDate"
                                                    className="text-right"
                                                >
                                                    Expiry Date
                                                </Label>
                                                <div className="col-span-3 space-y-1">
                                                    <Input
                                                        id="expiryDate"
                                                        name="expiryDate"
                                                        type="date"
                                                        className="col-span-3"
                                                        value={data.expiryDate}
                                                        onChange={(e: any) =>
                                                            setData(
                                                                'expiryDate',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    {errors.expiryDate && (
                                                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                            {errors.expiryDate}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {/* Reorder Level Input */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="reorderLevel"
                                                className="text-right"
                                            >
                                                Reorder Level
                                            </Label>
                                            <div className="col-span-3 space-y-1">
                                                <Input
                                                    id="reorderLevel"
                                                    name="reorderLevel"
                                                    type="number"
                                                    placeholder="100"
                                                    className={`col-span-3 ${errors.reorderLevel ? 'border-[1px] border-red-500' : ''}`}
                                                    min="0"
                                                    max={1000}
                                                    value={data.reorderLevel}
                                                    onChange={(e: any) =>
                                                        setData(
                                                            'reorderLevel',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                {errors.reorderLevel && (
                                                    <p className="text-red-600">
                                                        {errors.reorderLevel}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Image Upload with Preview (Add Form) */}
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label
                                                htmlFor="productImage"
                                                className="pt-2 text-right"
                                            >
                                                Product Image
                                            </Label>
                                            <div className="col-span-3 space-y-2">
                                                <Input
                                                    id="productImage"
                                                    name="productImage"
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png"
                                                    onChange={(e) =>
                                                        handleImageChange(
                                                            e,
                                                            false,
                                                        )
                                                    } // Pass isEdit: false
                                                    className="cursor-pointer"
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    Supported formats: JPG,
                                                    JPEG, PNG (max 5MB)
                                                </p>
                                                {errors.image && (
                                                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                        {errors.image}
                                                    </p>
                                                )}

                                                {/* Image Preview */}
                                                {imagePreview &&
                                                    isAddProductOpen && ( // Only show preview if Add dialog is open
                                                        <div className="mt-3">
                                                            <p className="mb-2 text-sm font-medium">
                                                                Preview:
                                                            </p>
                                                            <div className="h-32 w-32 overflow-hidden rounded-md border-2 border-dashed border-gray-300">
                                                                <img
                                                                    src={
                                                                        imagePreview
                                                                    }
                                                                    alt="Product preview"
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="mt-2"
                                                                onClick={() => {
                                                                    setImagePreview(
                                                                        null,
                                                                    );
                                                                    const fileInput =
                                                                        document.getElementById(
                                                                            'productImage',
                                                                        ) as HTMLInputElement;
                                                                    if (
                                                                        fileInput
                                                                    )
                                                                        fileInput.value =
                                                                            '';
                                                                    setData(
                                                                        'image',
                                                                        null,
                                                                    ); // Clear image data on form
                                                                }}
                                                            >
                                                                Remove Image
                                                            </Button>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter className="border-t border-gray-200 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 hover:shadow-md"
                                    >
                                        {processing
                                            ? 'Adding...'
                                            : 'Add Product'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* **NEW: View Product Dialog** */}
            <Dialog
                open={isViewProductOpen}
                onOpenChange={setIsViewProductOpen}
            >
                <DialogContent className="h-full overflow-hidden overflow-y-auto p-0 sm:max-w-[550px]">
                    {/* Header with Product Image */}
                    <div className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-6 pt-8 pb-24">
                        <DialogHeader className="relative z-10">
                            <DialogTitle className="text-2xl font-bold text-gray-800">
                                Product Details
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                Complete information for{' '}
                                <span className="font-semibold text-gray-800">
                                    {selectedProduct?.name}
                                </span>
                            </DialogDescription>
                        </DialogHeader>

                        {/* Product Image - Overlapping Design */}
                        {selectedProduct?.image && (
                            <div className="absolute -bottom-16 left-1/2 z-20 -translate-x-1/2">
                                <div className="h-32 w-32 overflow-hidden rounded-2xl bg-white shadow-xl ring-4 ring-white">
                                    <img
                                        src={resolveImageUrl(selectedProduct.image)}
                                        alt={selectedProduct.name}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div
                        className={`px-6 ${selectedProduct?.image ? 'pt-20' : 'pt-6'} space-y-6 pb-6`}
                    >
                        {/* Basic Information Card */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                Basic Information
                            </h3>
                            <div className="divide-y rounded-lg border border-gray-200 bg-white">
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Product Name
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {selectedProduct?.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Category
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {selectedProduct?.category}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Status
                                    </span>
                                    <Badge
                                        variant={
                                            selectedProduct?.status ===
                                            'in-stock'
                                                ? 'default'
                                                : selectedProduct?.status ===
                                                    'low-stock'
                                                  ? 'secondary'
                                                  : 'destructive'
                                        }
                                        className="font-medium"
                                    >
                                        {selectedProduct?.status
                                            .split('-')
                                            .map(
                                                (word) =>
                                                    word
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                    word.slice(1),
                                            )
                                            .join(' ')}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Barcode
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {selectedProduct?.barcode || 'Not set'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (!selectedProduct) return;

                                        setIsViewProductOpen(false);
                                        handleEditProduct(selectedProduct);
                                        setEditData(
                                            'barcode',
                                            generateBarcodeValue(),
                                        );
                                    }}
                                >
                                    <Barcode className="mr-1 h-4 w-4" />
                                    Generate Barcode
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        selectedProduct &&
                                        printBarcodeLabel(selectedProduct)
                                    }
                                >
                                    Print Barcode
                                </Button>
                            </div>
                        </div>

                        {/* Pricing Information Card */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                Pricing
                            </h3>
                            <div className="space-y-3 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                        Selling Price
                                    </span>
                                    <span className="text-lg font-bold text-blue-600">
                                        {formatCurrency(
                                            selectedProduct?.sellingPrice ?? 0,
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                        Cost Price
                                    </span>
                                    <span className="text-base font-semibold text-gray-600">
                                        {formatCurrency(
                                            selectedProduct?.initialAmount ?? 0,
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-t border-blue-200 pt-3">
                                    <span className="text-sm font-medium text-gray-700">
                                        Unit Profit
                                    </span>
                                    <span
                                        className={`text-lg font-bold ${(selectedProduct?.unitProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                        {(selectedProduct?.unitProfit ?? 0) >= 0
                                            ? '+'
                                            : ''}
                                        {formatCurrency(
                                            selectedProduct?.unitProfit ?? 0,
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Inventory Information Card */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                Inventory
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center transition-shadow hover:shadow-md">
                                    <div className="text-2xl font-bold text-gray-900">
                                        {selectedProduct?.totalQuantity}
                                    </div>
                                    <div className="mt-1 text-xs font-medium text-gray-500">
                                        Total Quantity
                                    </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center transition-shadow hover:shadow-md">
                                    <div className="text-2xl font-bold text-gray-900">
                                        {selectedProduct?.quantityLeft}
                                    </div>
                                    <div className="mt-1 text-xs font-medium text-gray-500">
                                        Quantity Left
                                    </div>
                                </div>
                            </div>

                            <div className="divide-y rounded-lg border border-gray-200 bg-white">
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Reorder Level
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {selectedProduct?.reorderLevel ?? 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Inventory Type
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {selectedProduct?.hasExpiry
                                            ? 'Perishable'
                                            : 'Non-perishable'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Batch Tracking
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {selectedProduct?.trackBatch
                                            ? 'Enabled'
                                            : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Serial Tracking
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {selectedProduct?.trackSerial
                                            ? 'Enabled'
                                            : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-600">
                                        Expiry Date
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {selectedProduct?.hasExpiry &&
                                        selectedProduct?.expiryDate
                                            ? new Date(
                                                  selectedProduct.expiryDate,
                                              ).toLocaleDateString('en-US', {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: 'numeric',
                                              })
                                            : 'Not tracked'}
                                    </span>
                                </div>
                            </div>

                            {selectedProduct?.trackBatch ? (
                                <div className="rounded-lg border border-gray-200 bg-white">
                                    <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold text-gray-700">
                                        <span>Batch Stock (FEFO)</span>
                                        <Button
                                            size="sm"
                                            onClick={openAddBatchDialog}
                                        >
                                            <Plus className="mr-1 h-3 w-3" />
                                            Add Batch
                                        </Button>
                                    </div>
                                    <div className="max-h-48 overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 text-left text-xs uppercase">
                                                <tr>
                                                    <th className="px-3 py-2">
                                                        Batch
                                                    </th>
                                                    <th className="px-3 py-2">
                                                        Qty
                                                    </th>
                                                    <th className="px-3 py-2">
                                                        Expiry
                                                    </th>
                                                    <th className="px-3 py-2 text-right">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(
                                                    selectedProduct.batches ??
                                                    []
                                                ).map((batch) => (
                                                    <tr
                                                        key={batch.id}
                                                        className="border-t"
                                                    >
                                                        <td className="px-3 py-2">
                                                            {batch.batchNumber}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {batch.quantity}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {batch.expiryDate
                                                                ? new Date(
                                                                      batch.expiryDate,
                                                                  ).toLocaleDateString()
                                                                : 'Not set'}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        openEditBatchDialog(
                                                                            batch,
                                                                        )
                                                                    }
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        handleDeleteBatch(
                                                                            batch.id,
                                                                        )
                                                                    }
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(selectedProduct.batches ?? [])
                                                    .length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={4}
                                                            className="px-3 py-3 text-center text-muted-foreground"
                                                        >
                                                            No active batches
                                                            available.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
                                    Non-batch stock uses simple quantity
                                    tracking from inventory.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <DialogFooter className="border-t bg-gray-50 px-6 py-4">
                        <Button
                            onClick={() => setIsViewProductOpen(false)}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg sm:w-auto"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isBatchDialogOpen}
                onOpenChange={setIsBatchDialogOpen}
            >
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingBatchId ? 'Edit Batch' : 'Add Batch'}
                        </DialogTitle>
                        <DialogDescription>
                            Manage batch-level stock for{' '}
                            <span className="font-semibold text-gray-800">
                                {selectedProduct?.name}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveBatch} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="batchNumber">Batch Number</Label>
                            <Input
                                id="batchNumber"
                                value={batchForm.batchNumber}
                                onChange={(event) =>
                                    setBatchForm((previous) => ({
                                        ...previous,
                                        batchNumber: event.target.value,
                                    }))
                                }
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="batchQuantity">Quantity</Label>
                            <Input
                                id="batchQuantity"
                                type="number"
                                min={0}
                                value={batchForm.quantity}
                                onChange={(event) =>
                                    setBatchForm((previous) => ({
                                        ...previous,
                                        quantity: parseInt(event.target.value),
                                    }))
                                }
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="batchExpiryDate">Expiry Date</Label>
                            <Input
                                id="batchExpiryDate"
                                type="date"
                                value={batchForm.expiryDate}
                                onChange={(event) =>
                                    setBatchForm((previous) => ({
                                        ...previous,
                                        expiryDate: event.target.value,
                                    }))
                                }
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsBatchDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isBatchSaving}>
                                {isBatchSaving
                                    ? 'Saving...'
                                    : editingBatchId
                                      ? 'Update Batch'
                                      : 'Add Batch'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* **NEW: Edit Product Dialog** */}
            <Dialog
                open={isEditProductOpen}
                onOpenChange={setIsEditProductOpen}
            >
                <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[600px]">
                    {/* Header Section - Fixed */}
                    <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 pt-6 pb-4">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-gray-800">
                                Edit Product
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-base text-gray-600">
                                Update details for{' '}
                                <span className="font-semibold text-gray-800">
                                    {selectedProduct?.name}
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        <div className="space-y-6">
                            {/* Product Information Section */}
                            <div className="space-y-5">
                                <h3 className="border-b pb-2 text-sm font-semibold tracking-wide text-gray-700 uppercase">
                                    Product Information
                                </h3>

                                {/* Name Input */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="editName"
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        Product Name{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="editName"
                                        name="name"
                                        value={editData.name}
                                        placeholder="Enter product name"
                                        className={`transition-all ${editErrors.name ? 'border-red-400 focus:ring-red-400' : 'focus:ring-blue-400'}`}
                                        onChange={(e) =>
                                            setEditData('name', e.target.value)
                                        }
                                    />
                                    {editErrors.name && (
                                        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                                            <span>⚠</span> {editErrors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="editBarcode"
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        Barcode
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="editBarcode"
                                            name="barcode"
                                            value={editData.barcode}
                                            placeholder="Scan or type barcode"
                                            className={
                                                editErrors.barcode
                                                    ? 'border-red-400'
                                                    : ''
                                            }
                                            onChange={(e) =>
                                                setEditData(
                                                    'barcode',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setEditData(
                                                    'barcode',
                                                    generateBarcodeValue(),
                                                )
                                            }
                                        >
                                            <Barcode className="mr-1 h-4 w-4" />
                                            Generate
                                        </Button>
                                    </div>
                                    {editErrors.barcode && (
                                        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                                            <span>⚠</span> {editErrors.barcode}
                                        </p>
                                    )}
                                </div>

                                {/* Category & Supplier Row */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {/* Category */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="editCategory"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Category{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Combobox
                                            options={categoryOptions}
                                            value={editData.category}
                                            onValueChange={(value) =>
                                                setEditData('category', value)
                                            }
                                            placeholder="Select category..."
                                            searchPlaceholder="Search categories..."
                                            emptyMessage="No category found."
                                        />
                                        {editErrors.category && (
                                            <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                                                <span>⚠</span>{' '}
                                                {editErrors.category}
                                            </p>
                                        )}
                                    </div>

                                    {/* Supplier */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="editSupplier"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Supplier{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Combobox
                                            options={supplierOptions}
                                            value={editData.supplier}
                                            onValueChange={(value) =>
                                                setEditData('supplier', value)
                                            }
                                            placeholder="Select supplier..."
                                            searchPlaceholder="Search suppliers..."
                                            emptyMessage="No supplier found."
                                        />
                                        {editErrors.supplier && (
                                            <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                                                <span>⚠</span>{' '}
                                                {editErrors.supplier}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Section */}
                            <div className="space-y-5">
                                <h3 className="border-b pb-2 text-sm font-semibold tracking-wide text-gray-700 uppercase">
                                    Pricing
                                </h3>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {/* Selling Price */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="editSellingPrice"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Selling Price{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                                GHS
                                            </span>
                                            <Input
                                                id="editSellingPrice"
                                                name="sellingPrice"
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className={`pl-12 ${editErrors.sellingPrice ? 'border-red-400' : ''}`}
                                                value={editData.sellingPrice}
                                                min="0"
                                                max={99999.99}
                                                onChange={(e) =>
                                                    setEditData(
                                                        'sellingPrice',
                                                        parseFloat(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                        {editErrors.sellingPrice && (
                                            <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                                                <span>⚠</span>{' '}
                                                {editErrors.sellingPrice}
                                            </p>
                                        )}
                                    </div>

                                    {/* Cost Price */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="editCostPrice"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Cost Price{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                                GHS
                                            </span>
                                            <Input
                                                id="editCostPrice"
                                                name="costPrice"
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className={`pl-12 ${editErrors.costPrice ? 'border-red-400' : ''}`}
                                                min="0"
                                                max={999999.99}
                                                value={editData.costPrice}
                                                onChange={(e) =>
                                                    setEditData(
                                                        'costPrice',
                                                        parseFloat(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                        {editErrors.costPrice && (
                                            <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                                                <span>⚠</span>{' '}
                                                {editErrors.costPrice}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Inventory Section */}
                            <div className="space-y-5">
                                <h3 className="border-b pb-2 text-sm font-semibold tracking-wide text-gray-700 uppercase">
                                    Inventory Management
                                </h3>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {/* Total Quantity */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="editTotalQuantity"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Total Quantity
                                        </Label>
                                        <Input
                                            id="editTotalQuantity"
                                            name="totalQuantity"
                                            type="number"
                                            placeholder="100"
                                            min="0"
                                            value={editData.totalQuantity}
                                            onChange={(e) =>
                                                setEditData(
                                                    'totalQuantity',
                                                    parseInt(e.target.value),
                                                )
                                            }
                                        />
                                        <p className="text-xs text-gray-500 italic">
                                            Managed via stock transactions
                                        </p>
                                        {editErrors.totalQuantity && (
                                            <p className="text-xs font-medium text-red-600">
                                                {editErrors.totalQuantity}
                                            </p>
                                        )}
                                    </div>

                                    {/* Reorder Level */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="editReorderLevel"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Reorder Level
                                        </Label>
                                        <Input
                                            id="editReorderLevel"
                                            name="reorderLevel"
                                            type="number"
                                            placeholder="100"
                                            className={
                                                editErrors.reorderLevel
                                                    ? 'border-red-400'
                                                    : ''
                                            }
                                            min="0"
                                            max={1000}
                                            value={editData.reorderLevel}
                                            onChange={(e) =>
                                                setEditData(
                                                    'reorderLevel',
                                                    parseInt(e.target.value),
                                                )
                                            }
                                        />
                                        {editErrors.reorderLevel && (
                                            <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                                                <span>⚠</span>{' '}
                                                {editErrors.reorderLevel}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Tracking */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">
                                        Tracking Configuration
                                    </Label>

                                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium">
                                                Track Expiry Date
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Enable for perishable products.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={editData.hasExpiry}
                                            onCheckedChange={(checked) => {
                                                setEditData(
                                                    'hasExpiry',
                                                    checked,
                                                );
                                                if (!checked) {
                                                    setEditData(
                                                        'trackBatch',
                                                        false,
                                                    );
                                                    setEditData(
                                                        'expiryDate',
                                                        '',
                                                    );
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium">
                                                Track Batch
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Use FEFO from nearest expiry
                                                batch.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={editData.trackBatch}
                                            disabled={!editData.hasExpiry}
                                            onCheckedChange={(checked) =>
                                                setEditData(
                                                    'trackBatch',
                                                    checked,
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium">
                                                Track Serial Number
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Optional for electronics.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={editData.trackSerial}
                                            onCheckedChange={(checked) =>
                                                setEditData(
                                                    'trackSerial',
                                                    checked,
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Expiry Date */}
                                {editData.hasExpiry && (
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="editExpiryDate"
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Expiry Date
                                        </Label>
                                        <Input
                                            id="editExpiryDate"
                                            name="expiryDate"
                                            type="date"
                                            className={
                                                editErrors.expiryDate
                                                    ? 'border-red-400'
                                                    : ''
                                            }
                                            value={editData.expiryDate}
                                            onChange={(e) =>
                                                setEditData(
                                                    'expiryDate',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {editErrors.expiryDate && (
                                            <p className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                                                <span>⚠</span>{' '}
                                                {editErrors.expiryDate}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Product Image Section */}
                            <div className="space-y-5">
                                <h3 className="border-b pb-2 text-sm font-semibold tracking-wide text-gray-700 uppercase">
                                    Product Image
                                </h3>

                                <div className="space-y-3">
                                    <Input
                                        id="editProductImage"
                                        name="productImage"
                                        type="file"
                                        accept=".jpg,.jpeg,.png"
                                        onChange={(e) =>
                                            handleImageChange(e, true)
                                        }
                                        className="cursor-pointer file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Supported: JPG, JPEG, PNG (max 5MB).
                                        Optional. Leave blank to keep the
                                        current image.
                                    </p>
                                    {editErrors.image && (
                                        <p className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                                            <span>⚠</span> {editErrors.image}
                                        </p>
                                    )}

                                    {/* Image Preview */}
                                    {imagePreview && isEditProductOpen && (
                                        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4">
                                            <p className="mb-3 text-sm font-medium text-gray-700">
                                                Preview:
                                            </p>
                                            <div className="flex items-start gap-4">
                                                <div className="h-32 w-32 overflow-hidden rounded-lg border-2 border-gray-300 shadow-sm">
                                                    <img
                                                        src={`/storage/${imagePreview}`}
                                                        alt={imagePreview}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-2 border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50"
                                                    onClick={() => {
                                                        setImagePreview(null);
                                                        const fileInput =
                                                            document.getElementById(
                                                                'editProductImage',
                                                            ) as HTMLInputElement | null;
                                                        if (fileInput)
                                                            fileInput.value =
                                                                '';
                                                        setEditData(
                                                            'image',
                                                            null,
                                                        );
                                                    }}
                                                >
                                                    Remove Image
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Section - Fixed */}
                    <DialogFooter className="border-t bg-gray-50 px-6 py-4">
                        <div className="flex w-full gap-3 sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditProductOpen(false)}
                                className="flex-1 sm:flex-none"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleEditProductSubmit}
                                disabled={editProcessing}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 px-8 font-semibold text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg sm:flex-none"
                            >
                                {editProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                        Saving...
                                    </span>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* **NEW: Excel Upload Dialog */}
            <Dialog
                open={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
            >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Import Products from Excel</DialogTitle>
                        <DialogDescription>
                            Upload an Excel file to import multiple products at
                            once.
                            <Button
                                variant="link"
                                className="ml-1 h-auto p-0 text-blue-600"
                                onClick={downloadExcelTemplate}
                            >
                                Download template
                            </Button>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCSVUpload} className="space-y-6">
                        <div className="space-y-4">
                            {/* File Upload Area */}
                            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-gray-400">
                                <Input
                                    id="excelFile"
                                    name="excelFile"
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <Label
                                    htmlFor="excelFile"
                                    className="flex cursor-pointer flex-col items-center justify-center space-y-2"
                                >
                                    <Upload className="h-8 w-8 text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {uploadFile
                                                ? uploadFile.name
                                                : 'Choose Excel file'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Supports .xlsx, .xls files (max
                                            10MB)
                                        </p>
                                    </div>
                                </Label>
                            </div>

                            {/* Progress Bar */}
                            {isUploading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Uploading...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-gray-200">
                                        <div
                                            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                                            style={{
                                                width: `${uploadProgress}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Instructions */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <h4 className="mb-2 text-sm font-medium text-blue-900">
                                    File Requirements:
                                </h4>
                                <ul className="space-y-1 text-xs text-blue-800">
                                    <li>• Use the provided template format</li>
                                    <li>
                                        • Category Name and Supplier Email must
                                        be valid existing
                                    </li>
                                    <li>
                                        • Dates should be in YYYY-MM-DD format
                                    </li>
                                    <li>
                                        • Has Expiry / Track Batch / Track
                                        Serial accept true or false
                                    </li>
                                    <li>
                                        • Prices should be numbers with up to 2
                                        decimal places
                                    </li>
                                    <li>
                                        • First row should contain column
                                        headers
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsUploadDialogOpen(false);
                                    setUploadFile(null);
                                    setUploadProgress(0);
                                }}
                                disabled={isUploading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!uploadFile || isUploading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isUploading
                                    ? 'Importing...'
                                    : 'Import Products'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Financial Summary */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Total Revenue */}
                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Revenue
                            </p>
                            <p className="text-2xl font-bold">
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'GHS',
                                }).format(totals.totalRevenue)}
                            </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                </div>
                {/* Total Cost */}
                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Cost
                            </p>
                            <p className="text-2xl font-bold">
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'GHS',
                                }).format(totals.totalCost)}
                            </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                </div>
                {/* Net Profit */}
                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Net Profit
                            </p>
                            <p
                                className={`text-2xl font-bold ${
                                    totals.totalProfit >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                }`}
                            >
                                {totals.totalProfit >= 0 ? '+' : ''}
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'GHS',
                                }).format(totals.totalProfit)}
                            </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="space-y-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                        {/* Product Name Search */}
                        <div className="w-full lg:max-w-sm">
                            <Input
                                placeholder="Search products..."
                                value={
                                    (table
                                        .getColumn('name')
                                        ?.getFilterValue() as string) ?? ''
                                }
                                onChange={(event) =>
                                    table
                                        .getColumn('name')
                                        ?.setFilterValue(event.target.value)
                                }
                                className="w-full"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="w-full lg:max-w-[200px]">
                            <Select
                                value={
                                    (table
                                        .getColumn('category')
                                        ?.getFilterValue() as string) ?? 'all'
                                }
                                onValueChange={(value) =>
                                    table
                                        .getColumn('category')
                                        ?.setFilterValue(
                                            value === 'all' ? '' : value,
                                        )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Categories
                                    </SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                    <SelectItem value="in-stock">
                                        In Stock
                                    </SelectItem>
                                    <SelectItem value="low-stock">
                                        Low Stock
                                    </SelectItem>
                                    <SelectItem value="out-of-stock">
                                        Out of Stock
                                    </SelectItem>
                                    <SelectItem value="expired">
                                        Expired
                                    </SelectItem>
                                    <SelectItem value="near-expiry">
                                        Near Expiry
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Inventory Type Filter */}
                        <div className="w-full lg:max-w-[220px]">
                            <Select
                                value={
                                    (table
                                        .getColumn('inventoryType')
                                        ?.getFilterValue() as string) ?? 'all'
                                }
                                onValueChange={(value) =>
                                    table
                                        .getColumn('inventoryType')
                                        ?.setFilterValue(
                                            value === 'all' ? '' : value,
                                        )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Inventory type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Types
                                    </SelectItem>
                                    <SelectItem value="perishable">
                                        Perishable
                                    </SelectItem>
                                    <SelectItem value="non-perishable">
                                        Non-perishable
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Profit Filter */}
                        <div className="w-full lg:max-w-[200px]">
                            <Select
                                value={
                                    (table
                                        .getColumn('profit')
                                        ?.getFilterValue() as string) ?? 'all'
                                }
                                onValueChange={(value) => {
                                    if (value === 'all') {
                                        table
                                            .getColumn('profit')
                                            ?.setFilterValue('');
                                    } else if (value === 'profitable') {
                                        table
                                            .getColumn('profit')
                                            ?.setFilterValue(['0', '1000000']);
                                    } else if (value === 'loss') {
                                        table
                                            .getColumn('profit')
                                            ?.setFilterValue([
                                                '-1000000',
                                                '-1',
                                            ]);
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Profitability" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Products
                                    </SelectItem>
                                    <SelectItem value="profitable">
                                        Profitable
                                    </SelectItem>
                                    <SelectItem value="loss">
                                        Making Loss
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
                                                    ? 'Product Name'
                                                    : column.id ===
                                                        'totalQuantity'
                                                      ? 'Total Quantity'
                                                      : column.id ===
                                                          'quantityLeft'
                                                        ? 'Quantity Left'
                                                        : column.id ===
                                                            'quantitySold'
                                                          ? 'Quantity Sold'
                                                          : column.id ===
                                                              'sellingPrice'
                                                            ? 'Selling Price'
                                                            : column.id ===
                                                                'initialAmount'
                                                              ? 'Cost Price'
                                                              : column.id ===
                                                                  'unitProfit'
                                                                ? 'Unit Profit'
                                                                : column.id ===
                                                                    'profit'
                                                                  ? 'Total Profit'
                                                                  : column.id ===
                                                                      'inventoryType'
                                                                    ? 'Inventory Type'
                                                                    : column.id ===
                                                                        'expiryDate'
                                                                      ? 'Expiry Date'
                                                                      : column.id ===
                                                                          'image'
                                                                        ? 'Image'
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
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No products found. Try adjusting your
                                    filters or{' '}
                                    <Button
                                        variant="link"
                                        className="h-auto p-0"
                                        onClick={() =>
                                            setIsAddProductOpen(true)
                                        }
                                    >
                                        add a new product
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
    );
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Products',
        href: '/products',
    },
];

export default function Products({ products }: { products: Product[] }) {
    // Add category_id and supplier_id to initial products if they don't exist
    const productsWithIds = products.map((p) => ({
        ...p,
        category_id: p.category_id || 0, // Fallback to 0 if not present
        supplier_id: p.supplier_id || 0, // Fallback to 0 if not present
        expiryDate: p.expiryDate ? new Date(p.expiryDate as string) : null,
        hasExpiry: p.hasExpiry ?? false,
        trackBatch: p.trackBatch ?? false,
        trackSerial: p.trackSerial ?? false,
        stockMode: p.stockMode ?? 'inventory',
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <ProducIndexPage productData={productsWithIds} />
        </AppLayout>
    );
}
