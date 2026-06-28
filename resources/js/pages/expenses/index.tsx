"use client"

import * as React from "react"
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
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Filter, X, Plus, Download, Receipt, Calendar, Tag, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock, FileText, User, Building, Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';

const expensesData: Expense[] = [
  {
    id: "exp_1",
    description: "Office Rent - January 2024",
    amount: 2500.00,
    category: "rent",
    paymentMethod: "bank_transfer",
    date: new Date("2024-01-01"),
    status: "approved",
    vendor: "Prime Office Spaces",
    receiptNumber: "REC-00124",
    submittedBy: "John Smith",
    approvedBy: "Sarah Johnson",
    approvedDate: new Date("2024-01-02"),
    notes: "Monthly office space rental",
    receiptAttachment: "/receipts/rent-jan24.pdf",
  },
  {
    id: "exp_2",
    description: "Team Lunch - Client Meeting",
    amount: 345.50,
    category: "meals",
    paymentMethod: "credit_card",
    date: new Date("2024-01-15"),
    status: "approved",
    vendor: "Urban Bistro",
    receiptNumber: "REC-00125",
    submittedBy: "Mike Davis",
    approvedBy: "Sarah Johnson",
    approvedDate: new Date("2024-01-16"),
    notes: "Client appreciation lunch",
    receiptAttachment: "/receipts/lunch-jan15.pdf",
  },
  {
    id: "exp_3",
    description: "New Laptops for Development Team",
    amount: 4800.00,
    category: "equipment",
    paymentMethod: "credit_card",
    date: new Date("2024-01-18"),
    status: "pending",
    vendor: "TechGadgets Inc.",
    receiptNumber: "REC-00126",
    submittedBy: "Lisa Chen",
    approvedBy: "",
    approvedDate: null,
    notes: "3x MacBook Pro for new developers",
    receiptAttachment: "/receipts/laptops-jan18.pdf",
  },
  {
    id: "exp_4",
    description: "Google Workspace Subscription",
    amount: 180.00,
    category: "software",
    paymentMethod: "credit_card",
    date: new Date("2024-01-05"),
    status: "approved",
    vendor: "Google Cloud",
    receiptNumber: "REC-00127",
    submittedBy: "Alex Johnson",
    approvedBy: "Sarah Johnson",
    approvedDate: new Date("2024-01-06"),
    notes: "Monthly business subscription",
    receiptAttachment: "/receipts/google-workspace-jan.pdf",
  },
  {
    id: "exp_5",
    description: "Flight to Client Conference",
    amount: 645.75,
    category: "travel",
    paymentMethod: "credit_card",
    date: new Date("2024-01-22"),
    status: "rejected",
    vendor: "Skyline Airlines",
    receiptNumber: "REC-00128",
    submittedBy: "David Brown",
    approvedBy: "Sarah Johnson",
    approvedDate: new Date("2024-01-23"),
    notes: "Flight expenses exceeded budget limit",
    receiptAttachment: "/receipts/flight-jan22.pdf",
  },
  {
    id: "exp_6",
    description: "Marketing Materials Printing",
    amount: 890.25,
    category: "marketing",
    paymentMethod: "bank_transfer",
    date: new Date("2024-01-25"),
    status: "pending",
    vendor: "PrintPro Solutions",
    receiptNumber: "REC-00129",
    submittedBy: "Emma Wilson",
    approvedBy: "",
    approvedDate: null,
    notes: "Brochures and business cards for upcoming event",
    receiptAttachment: "/receipts/printing-jan25.pdf",
  },
  {
    id: "exp_7",
    description: "Internet and Phone Services",
    amount: 220.00,
    category: "utilities",
    paymentMethod: "bank_transfer",
    date: new Date("2024-01-10"),
    status: "approved",
    vendor: "Connect Telecom",
    receiptNumber: "REC-00130",
    submittedBy: "Robert Taylor",
    approvedBy: "Sarah Johnson",
    approvedDate: new Date("2024-01-11"),
    notes: "Monthly internet and phone bill",
    receiptAttachment: "/receipts/internet-jan.pdf",
  },
  {
    id: "exp_8",
    description: "Team Building Activity",
    amount: 1200.00,
    category: "entertainment",
    paymentMethod: "credit_card",
    date: new Date("2024-01-28"),
    status: "pending",
    vendor: "Adventure Zone",
    receiptNumber: "REC-00131",
    submittedBy: "Maria Garcia",
    approvedBy: "",
    approvedDate: null,
    notes: "Quarterly team building event",
    receiptAttachment: "/receipts/teambuilding-jan28.pdf",
  },
]

export type Expense = {
  id: string
  description: string
  amount: number
  category: "rent" | "meals" | "equipment" | "software" | "travel" | "marketing" | "utilities" | "entertainment" | "other"
  paymentMethod: "cash" | "credit_card" | "bank_transfer" | "paypal"
  date: Date
  status: "pending" | "approved" | "rejected" | "paid"
  vendor: string
  receiptNumber: string
  submittedBy: string
  approvedBy: string
  approvedDate: Date | null
  notes: string
  receiptAttachment?: string
}

export const expenseColumns: ColumnDef<Expense>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
    accessorKey: "receiptNumber",
    header: "Receipt #",
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono font-medium">{row.getValue("receiptNumber")}</span>
      </div>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      const formatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      return (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatted}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue("description")}</div>
        <div className="text-sm text-muted-foreground">
          {row.original.vendor}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      const getCategoryColor = (category: string) => {
        switch (category) {
          case "rent": return "bg-blue-100 text-blue-800 border-blue-200"
          case "meals": return "bg-green-100 text-green-800 border-green-200"
          case "equipment": return "bg-purple-100 text-purple-800 border-purple-200"
          case "software": return "bg-orange-100 text-orange-800 border-orange-200"
          case "travel": return "bg-cyan-100 text-cyan-800 border-cyan-200"
          case "marketing": return "bg-pink-100 text-pink-800 border-pink-200"
          case "utilities": return "bg-gray-100 text-gray-800 border-gray-200"
          case "entertainment": return "bg-yellow-100 text-yellow-800 border-yellow-200"
          default: return "bg-gray-100 text-gray-800 border-gray-200"
        }
      }
      
      const getCategoryLabel = (category: string) => {
        switch (category) {
          case "rent": return "Rent"
          case "meals": return "Meals"
          case "equipment": return "Equipment"
          case "software": return "Software"
          case "travel": return "Travel"
          case "marketing": return "Marketing"
          case "utilities": return "Utilities"
          case "entertainment": return "Entertainment"
          default: return "Other"
        }
      }
      
      return (
        <Badge variant="outline" className={`capitalize ${getCategoryColor(category)}`}>
          <Tag className="h-3 w-3 mr-1" />
          {getCategoryLabel(category)}
        </Badge>
      )
    },
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === "all") return true
      return row.getValue(columnId) === filterValue
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      
      return (
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-bold">{formatted}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment Method",
    cell: ({ row }) => {
      const method = row.getValue("paymentMethod") as string
      const getMethodLabel = (method: string) => {
        switch (method) {
          case "credit_card": return "Credit Card"
          case "bank_transfer": return "Bank Transfer"
          case "paypal": return "PayPal"
          case "cash": return "Cash"
          default: return method
        }
      }
      
      return (
        <Badge variant="secondary" className="capitalize">
          {getMethodLabel(method)}
        </Badge>
      )
    },
  },
  {
    accessorKey: "submittedBy",
    header: "Submitted By",
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>{row.getValue("submittedBy")}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "approved": return "default"
          case "pending": return "secondary"
          case "rejected": return "destructive"
          case "paid": return "outline"
          default: return "outline"
        }
      }
      
      const getStatusIcon = (status: string) => {
        switch (status) {
          case "approved": return <CheckCircle className="h-3 w-3 mr-1" />
          case "pending": return <Clock className="h-3 w-3 mr-1" />
          case "rejected": return <AlertTriangle className="h-3 w-3 mr-1" />
          case "paid": return <DollarSign className="h-3 w-3 mr-1" />
          default: return <Clock className="h-3 w-3 mr-1" />
        }
      }
      
      const getStatusColor = (status: string) => {
        switch (status) {
          case "approved": return "text-green-600"
          case "pending": return "text-yellow-600"
          case "rejected": return "text-red-600"
          case "paid": return "text-blue-600"
          default: return "text-gray-600"
        }
      }
      
      return (
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
          <Badge variant={getStatusVariant(status)}>
            {getStatusIcon(status)}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      )
    },
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === "all") return true
      return row.getValue(columnId) === filterValue
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const expense = row.original

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
                console.log("View expense details:", expense.id)
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {expense.receiptAttachment && (
              <DropdownMenuItem
                onClick={() => {
                  console.log("Download receipt:", expense.receiptAttachment)
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                console.log("Edit expense:", expense.id)
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Expense
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {expense.status === "pending" && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    console.log("Approve expense:", expense.id)
                  }}
                  className="text-green-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    console.log("Reject expense:", expense.id)
                  }}
                  className="text-red-600"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
            {expense.status === "approved" && (
              <DropdownMenuItem
                onClick={() => {
                  console.log("Mark as paid:", expense.id)
                }}
                className="text-blue-600"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => {
                console.log("Delete expense:", expense.id)
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Expense
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

const ExpenseIndexPage = () => {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [isAddExpenseOpen, setIsAddExpenseOpen] = React.useState(false)
  const [expenses, setExpenses] = React.useState<Expense[]>(expensesData)
  const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  })

  const table = useReactTable({
    data: expenses,
    columns: expenseColumns,
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
  })

  // Calculate summary statistics
  const summary = React.useMemo(() => {
    const filteredExpenses = expenses.filter(expense => {
      if (!dateRange.from || !dateRange.to) return true
      const expenseDate = new Date(expense.date)
      return expenseDate >= dateRange.from && expenseDate <= dateRange.to
    })

    return filteredExpenses.reduce((acc, expense) => {
      acc.totalAmount += expense.amount
      if (expense.status === 'approved' || expense.status === 'paid') {
        acc.approvedAmount += expense.amount
      }
      if (expense.status === 'pending') {
        acc.pendingAmount += expense.amount
      }
      if (expense.status === 'rejected') {
        acc.rejectedAmount += expense.amount
      }
      acc.totalExpenses += 1
      return acc
    }, {
      totalAmount: 0,
      approvedAmount: 0,
      pendingAmount: 0,
      rejectedAmount: 0,
      totalExpenses: 0
    })
  }, [expenses, dateRange])

  // Expenses by category
  const expensesByCategory = React.useMemo(() => {
    const categoryTotals = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0
      }
      acc[expense.category] += expense.amount
      return acc
    }, {} as Record<string, number>)

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  const categories = [
    "rent", "meals", "equipment", "software", "travel", "marketing", "utilities", "entertainment", "other"
  ]

  const getActiveFiltersCount = () => {
    return columnFilters.filter(filter => 
      filter.value && (Array.isArray(filter.value) ? filter.value.length > 0 : filter.value !== "")
    ).length
  }

  const clearAllFilters = () => {
    setColumnFilters([])
  }

  const handleAddExpense = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    
    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      description: formData.get("description") as string,
      amount: parseFloat(formData.get("amount") as string),
      category: formData.get("category") as Expense['category'],
      paymentMethod: formData.get("paymentMethod") as Expense['paymentMethod'],
      date: new Date(formData.get("date") as string),
      status: "pending",
      vendor: formData.get("vendor") as string,
      receiptNumber: `REC-${String(expenses.length + 1).padStart(5, '0')}`,
      submittedBy: "Current User", // This would come from auth context
      approvedBy: "",
      approvedDate: null,
      notes: formData.get("notes") as string,
    }

    setExpenses(prev => [newExpense, ...prev])
    setIsAddExpenseOpen(false)
    
    // Reset form
    event.currentTarget.reset()
  }

  const exportToCSV = () => {
    const headers = [
      'Receipt Number',
      'Date',
      'Description',
      'Vendor',
      'Category',
      'Amount',
      'Payment Method',
      'Status',
      'Submitted By',
      'Approved By',
      'Notes'
    ].join(',')

    const csvData = expenses.map(expense => [
      expense.receiptNumber,
      new Date(expense.date).toLocaleDateString(),
      expense.description,
      expense.vendor,
      expense.category,
      expense.amount,
      expense.paymentMethod,
      expense.status,
      expense.submittedBy,
      expense.approvedBy,
      expense.notes
    ].join(','))

    const csv = [headers, ...csvData].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full min-w-0 space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header with Add Expense Button */}
      <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-muted-foreground">
            Track, manage, and approve business expenses
          </p>
        </div>
        
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Submit a new expense for approval. Make sure to attach the receipt.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddExpense}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      placeholder="Brief description of the expense"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        min="0"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select name="paymentMethod" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      name="vendor"
                      placeholder="Company or individual paid"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="receiptAttachment">Receipt Attachment</Label>
                    <Input
                      id="receiptAttachment"
                      name="receiptAttachment"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <p className="text-sm text-muted-foreground">
                      Supported formats: PDF, JPG, JPEG, PNG (max 10MB)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Additional notes or context"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Submit Expense</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(summary.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalExpenses} expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(summary.approvedAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(summary.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(summary.rejectedAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Not approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Expense</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(summary.totalExpenses > 0 ? summary.totalAmount / summary.totalExpenses : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per expense
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Expenses by Category */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>
              Distribution of expenses across different categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expensesByCategory.map(({ category, amount }) => {
                const percentage = summary.totalAmount > 0 ? (amount / summary.totalAmount) * 100 : 0
                const getCategoryColor = (category: string) => {
                  switch (category) {
                    case "rent": return "bg-blue-500"
                    case "meals": return "bg-green-500"
                    case "equipment": return "bg-purple-500"
                    case "software": return "bg-orange-500"
                    case "travel": return "bg-cyan-500"
                    case "marketing": return "bg-pink-500"
                    case "utilities": return "bg-gray-500"
                    case "entertainment": return "bg-yellow-500"
                    default: return "bg-gray-400"
                  }
                }
                
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getCategoryColor(category)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest expense submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenses.slice(0, 4).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(expense.amount)}
                    </p>
                    <Badge variant={expense.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                      {expense.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Status Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="responsive-tabs-grid-5">
          <TabsTrigger value="all">All Expenses</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters Section */}
      <div className="space-y-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
            {/* Date Range */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date Range:</span>
              <Input
                type="date"
                value={dateRange.from?.toISOString().split('T')[0] || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }))}
                className="w-full sm:w-[140px]"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateRange.to?.toISOString().split('T')[0] || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }))}
                className="w-full sm:w-[140px]"
              />
            </div>

            {/* Description Search */}
            <div className="w-full lg:max-w-sm">
              <Input
                placeholder="Search expenses..."
                value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("description")?.setFilterValue(event.target.value)
                }
                className="w-full"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full lg:max-w-[200px]">
              <Select
                value={(table.getColumn("category")?.getFilterValue() as string) ?? "all"}
                onValueChange={(value) => 
                  table.getColumn("category")?.setFilterValue(value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:max-w-[200px]">
              <Select
                value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
                onValueChange={(value) => 
                  table.getColumn("status")?.setFilterValue(value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
                <X className="h-4 w-4 mr-1" />
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
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id === "receiptNumber" ? "Receipt #" : 
                         column.id === "description" ? "Description" :
                         column.id === "submittedBy" ? "Submitted By" :
                         column.id === "paymentMethod" ? "Payment Method" :
                         column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Display */}
        {getActiveFiltersCount() > 0 && (
          <div className="flex flex-wrap gap-2">
            {columnFilters.map((filter, index) => {
              if (!filter.value || (Array.isArray(filter.value) && filter.value.length === 0)) return null
              
              return (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {filter.id}: {Array.isArray(filter.value) ? filter.value.join(" - ") : filter.value.toString()}
                  <button
                    onClick={() => {
                      setColumnFilters(prev => prev.filter((_, i) => i !== index))
                    }}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
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
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={expenseColumns.length}
                  className="h-24 text-center"
                >
                  No expenses found. Try adjusting your filters or{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={() => setIsAddExpenseOpen(true)}
                  >
                    add a new expense
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
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
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
    </div>
  )
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
  },
  {
    title: 'Expenses',
    href: '/expenses',
  },
];

export default function Expenses() {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Expense Management" />
      <ExpenseIndexPage />
    </AppLayout>
  );
}