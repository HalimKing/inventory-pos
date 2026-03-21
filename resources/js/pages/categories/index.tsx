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
    ChevronDown,
    Filter,
    MoreHorizontal,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import React, { useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
// SweetAlert2 for confirmation dialogs
import Swal from 'sweetalert2';

export type Category = {
    id: string;
    name: string;
    description: string;
    productCount?: number;
    createdAt?: string;
    updatedAt?: string;
};

export const columns: ColumnDef<Category>[] = [
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
        accessorKey: 'name',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Category Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue('name')}</div>
        ),
    },
    {
        accessorKey: 'description',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Description
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => (
            <div className="text-wrap text-muted-foreground">
                {row.getValue('description')}
            </div>
        ),
    },
    {
        accessorKey: 'productCount',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                >
                    Products
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const count = parseInt(row.getValue('productCount') as string);
            return <div className="text-center">{count}</div>;
        },
    },

    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
            const category = row.original;

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
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent('viewCategory', {
                                        detail: category,
                                    }),
                                )
                            }
                        >
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent('editCategory', {
                                        detail: category,
                                    }),
                                )
                            }
                        >
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent('deleteCategory', {
                                        detail: category,
                                    }),
                                )
                            }
                        >
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

interface FormData {
    name: string;
    description: string;
}

interface EditFormData extends FormData {
    id: string;
}

const CategoryIndexPage = ({
    categoriesData,
}: {
    categoriesData: Category[];
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [isAddCategoryOpen, setIsAddCategoryOpen] = React.useState(false);
    const [isEditCategoryOpen, setIsEditCategoryOpen] = React.useState(false);
    const [isViewCategoryOpen, setIsViewCategoryOpen] = React.useState(false);
    const [categories, setCategories] =
        React.useState<Category[]>(categoriesData);
    const [editingCategory, setEditingCategory] =
        React.useState<Category | null>(null);
    const [viewingCategory, setViewingCategory] =
        React.useState<Category | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [bulkDeleting, setBulkDeleting] = React.useState(false);
    const { flash } = usePage().props as { flash?: FlashMessages };

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        description: '',
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
        name: '',
        description: '',
    });

    const table = useReactTable({
        data: categories,
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

    // Get selected rows
    const getSelectedCategories = (): Category[] => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        return selectedRows.map((row) => row.original);
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        const selectedCategories = getSelectedCategories();

        if (selectedCategories.length === 0) {
            toast.warning('Please select at least one category to delete.');
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            html: `You are about to delete <strong>${selectedCategories.length}</strong> categor${selectedCategories.length === 1 ? 'y' : 'ies'}. This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: `Yes, delete ${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}!`,
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            customClass: {
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel',
            },
        });

        if (result.isConfirmed) {
            setBulkDeleting(true);
            try {
                const categoryIds = selectedCategories.map(
                    (category) => category.id,
                );

                // Send bulk delete request
                const response = await axios.post(
                    '/admin/categories/bulk-delete/categories',
                    {
                        ids: categoryIds,
                    },
                );

                console.log(response.data);

                // Refresh categories data after successful deletion
                await fetchCategories();

                // Clear selection
                table.toggleAllPageRowsSelected(false);

                toast.success(
                    `Successfully deleted ${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}.`,
                );
            } catch (error) {
                console.error('Error bulk deleting categories:', error);
                toast.error('Failed to delete categories');
            } finally {
                setBulkDeleting(false);
            }
        }
    };

    // handle messages after add/edit/delete
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const handleAddCategory = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/admin/categories', {
            onSuccess: () => {
                setIsAddCategoryOpen(false);
                setData({ name: '', description: '' });
                // Refresh categories data
                fetchCategories();

                if (flash?.success) {
                    toast.success('Category created successfully!');
                }
            },
            onError: (errors) => {
                console.error('Error occured: ' + errors);

                toast.error('Failed to create category');
            },
        });
    };

    const handleEditCategory = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingCategory) return;

        put(`/admin/categories/${editingCategory.id}`, {
            onSuccess: () => {
                // Refetch categories from server to get updated data
                fetchCategories();

                setIsEditCategoryOpen(false);
                setEditingCategory(null);
                resetEditForm();

                if (flash?.success) {
                    toast.success('Category updated successfully!');
                }
            },
            onError: () => {
                toast.error('Failed to update category');
            },
        });
    };

    const handleDeleteCategory = async (category: Category) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the category "${category.name}" with it related products. This action cannot be undone.`,
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
            setDeleting(true);
            try {
                await axios.delete(`/admin/categories/${category.id}`);

                // Refresh categories data after successful deletion
                await fetchCategories();

                toast.success(
                    `Category "${category.name}" has been deleted successfully.`,
                );
            } catch (error) {
                console.error('Error deleting category:', error);
                toast.error('Failed to delete category');
            } finally {
                setDeleting(false);
            }
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(
                '/admin/categories/fetch-categories',
            );
            console.log('Raw response:', response);

            // The data should be directly in response.data
            const categoriesData = response.data;

            if (Array.isArray(categoriesData)) {
                setCategories(categoriesData);
            } else {
                console.error('Expected array but got:', categoriesData);
                toast.error('Invalid data format received');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load categories');
        }
    };

    const openEditDialog = (category: Category) => {
        setEditingCategory(category);
        setEditData({
            id: category.id,
            name: category.name,
            description: category.description,
        });
        setIsEditCategoryOpen(true);
    };

    const openViewDialog = (category: Category) => {
        setViewingCategory(category);
        setIsViewCategoryOpen(true);
    };

    const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEditData({
            ...editData,
            [event.target.name]: event.target.value,
        });
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setData({
            ...data,
            [event.target.name]: event.target.value,
        });
    };

    // Format date for display
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Listen for events from the actions dropdown
    useEffect(() => {
        const handleViewEvent = (event: CustomEvent) => {
            openViewDialog(event.detail);
        };

        const handleEditEvent = (event: CustomEvent) => {
            openEditDialog(event.detail);
        };

        const handleDeleteEvent = (event: CustomEvent) => {
            handleDeleteCategory(event.detail);
        };

        window.addEventListener(
            'viewCategory',
            handleViewEvent as EventListener,
        );
        window.addEventListener(
            'editCategory',
            handleEditEvent as EventListener,
        );
        window.addEventListener(
            'deleteCategory',
            handleDeleteEvent as EventListener,
        );

        return () => {
            window.removeEventListener(
                'viewCategory',
                handleViewEvent as EventListener,
            );
            window.removeEventListener(
                'editCategory',
                handleEditEvent as EventListener,
            );
            window.removeEventListener(
                'deleteCategory',
                handleDeleteEvent as EventListener,
            );
        };
    }, []);

    // Calculate summary statistics
    const summary = React.useMemo(() => {
        return categories.reduce(
            (acc, category) => {
                acc.totalCategories += 1;
                acc.totalProducts += category.productCount || 0;
                return acc;
            },
            { totalCategories: 0, totalProducts: 0, activeCategories: 0 },
        );
    }, [categories]);

    return (
        <div className="w-full p-4 sm:p-6 lg:p-10">
            {/* Header with Add Category Button */}
            <div className="flex items-center justify-between py-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Categories
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your product categories and organization
                    </p>
                </div>

                <Dialog
                    open={isAddCategoryOpen}
                    onOpenChange={setIsAddCategoryOpen}
                >
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Category
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add New Category</DialogTitle>
                            <DialogDescription>
                                Create a new product category to organize your
                                inventory.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleAddCategory}
                            className="space-y-6"
                        >
                            <div className="space-y-4">
                                {/* Name Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <Label
                                            htmlFor="name"
                                            className="w-20 text-right font-medium text-gray-700"
                                        >
                                            Name
                                        </Label>
                                        <div className="flex-1">
                                            <Input
                                                id="name"
                                                name="name"
                                                value={data.name}
                                                placeholder="Enter category name"
                                                className="w-full transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                    {errors.name && (
                                        <div className="ml-24">
                                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                {errors.name}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Description Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <Label
                                            htmlFor="description"
                                            className="w-20 text-right font-medium text-gray-700"
                                        >
                                            Description
                                        </Label>
                                        <div className="flex-1">
                                            <Input
                                                id="description"
                                                name="description"
                                                value={data.description}
                                                placeholder="Enter category description"
                                                className="w-full transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                    {errors.description && (
                                        <div className="ml-24">
                                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                {errors.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="border-t border-gray-200 pt-4">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 hover:shadow-md"
                                >
                                    {processing ? 'Adding...' : 'Add Category'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* View Category Dialog */}
                <Dialog
                    open={isViewCategoryOpen}
                    onOpenChange={setIsViewCategoryOpen}
                >
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Category Details</DialogTitle>
                            <DialogDescription>
                                View detailed information about this category.
                            </DialogDescription>
                        </DialogHeader>
                        {viewingCategory && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    {/* Category Name */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">
                                            Category Name
                                        </Label>
                                        <div className="rounded-lg border bg-gray-50 p-3">
                                            <p className="font-medium text-gray-900">
                                                {viewingCategory.name}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">
                                            Description
                                        </Label>
                                        <div className="min-h-[80px] rounded-lg border bg-gray-50 p-3">
                                            <p className="whitespace-pre-wrap text-gray-700">
                                                {viewingCategory.description ||
                                                    'No description provided'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Product Count */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">
                                            Number of Products
                                        </Label>
                                        <div className="rounded-lg border bg-gray-50 p-3">
                                            <p className="text-gray-700">
                                                {viewingCategory.productCount ||
                                                    0}{' '}
                                                products
                                            </p>
                                        </div>
                                    </div>

                                    {/* Additional Information */}
                                    <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2">
                                        {viewingCategory.createdAt && (
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700">
                                                    Created Date
                                                </Label>
                                                <div className="rounded border bg-gray-50 p-2">
                                                    <p className="text-sm text-gray-600">
                                                        {formatDate(
                                                            viewingCategory.createdAt,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {viewingCategory.updatedAt && (
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-sm font-medium text-gray-700">
                                                    Last Updated
                                                </Label>
                                                <div className="rounded border bg-gray-50 p-2">
                                                    <p className="text-sm text-gray-600">
                                                        {formatDate(
                                                            viewingCategory.updatedAt,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <DialogFooter className="border-t border-gray-200 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsViewCategoryOpen(false)
                                        }
                                        className="mr-2"
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setIsViewCategoryOpen(false);
                                            openEditDialog(viewingCategory);
                                        }}
                                        className="bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Edit Category
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Edit Category Dialog */}
                <Dialog
                    open={isEditCategoryOpen}
                    onOpenChange={setIsEditCategoryOpen}
                >
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                            <DialogDescription>
                                Update the category information.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleEditCategory}
                            className="space-y-6"
                        >
                            <div className="space-y-4">
                                {/* Name Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <Label
                                            htmlFor="edit-name"
                                            className="w-20 text-right font-medium text-gray-700"
                                        >
                                            Name
                                        </Label>
                                        <div className="flex-1">
                                            <Input
                                                id="edit-name"
                                                name="name"
                                                value={editData.name}
                                                placeholder="Enter category name"
                                                className="w-full transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                onChange={handleEditChange}
                                            />
                                        </div>
                                    </div>
                                    {editErrors.name && (
                                        <div className="ml-24">
                                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                {editErrors.name}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Description Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <Label
                                            htmlFor="edit-description"
                                            className="w-20 text-right font-medium text-gray-700"
                                        >
                                            Description
                                        </Label>
                                        <div className="flex-1">
                                            <Input
                                                id="edit-description"
                                                name="description"
                                                value={editData.description}
                                                placeholder="Enter category description"
                                                className="w-full transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                onChange={handleEditChange}
                                            />
                                        </div>
                                    </div>
                                    {editErrors.description && (
                                        <div className="ml-24">
                                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                                                {editErrors.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="border-t border-gray-200 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditCategoryOpen(false)}
                                    className="mr-2"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editProcessing}
                                    className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 hover:shadow-md"
                                >
                                    {editProcessing
                                        ? 'Updating...'
                                        : 'Update Category'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Categories
                            </p>
                            <p className="text-2xl font-bold">
                                {summary.totalCategories}
                            </p>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                            <span className="text-sm font-bold text-blue-600">
                                C
                            </span>
                        </div>
                    </div>
                </div>
                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Products
                            </p>
                            <p className="text-2xl font-bold">
                                {summary.totalProducts}
                            </p>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                            <span className="text-sm font-bold text-green-600">
                                P
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar - Only show when rows are selected */}
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center space-x-2">
                        <Badge
                            variant="secondary"
                            className="border-blue-200 bg-blue-100 px-3 py-1 text-blue-800"
                        >
                            {table.getFilteredSelectedRowModel().rows.length}{' '}
                            categor
                            {table.getFilteredSelectedRowModel().rows.length ===
                            1
                                ? 'y'
                                : 'ies'}{' '}
                            selected
                        </Badge>
                        <span className="text-sm text-blue-700">
                            Select all {table.getFilteredRowModel().rows.length}{' '}
                            rows
                        </span>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {bulkDeleting
                            ? 'Deleting...'
                            : `Delete Selected (${table.getFilteredSelectedRowModel().rows.length})`}
                    </Button>
                </div>
            )}

            {/* Filters Section */}
            <div className="space-y-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                        {/* Category Name Search */}
                        <div className="w-full lg:max-w-sm">
                            <Input
                                placeholder="Search categories..."
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
                                                    ? 'Category Name'
                                                    : column.id ===
                                                        'description'
                                                      ? 'Description'
                                                      : column.id ===
                                                          'productCount'
                                                        ? 'Product Count'
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
                                    No categories found. Try adjusting your
                                    filters or{' '}
                                    <Button
                                        variant="link"
                                        className="h-auto p-0"
                                        onClick={() =>
                                            setIsAddCategoryOpen(true)
                                        }
                                    >
                                        add a new category
                                    </Button>
                                    .
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination and Selection Info */}
            <div className="flex items-center justify-between space-x-2 py-4">
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
        title: 'Categories',
        href: '/categories',
    },
];

export default function Categories({
    categoriesData,
}: {
    categoriesData: Category[];
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categories" />
            <CategoryIndexPage categoriesData={categoriesData} />
        </AppLayout>
    );
}
