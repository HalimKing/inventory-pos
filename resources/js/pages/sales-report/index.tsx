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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Filter, X, Plus, TrendingUp, Download, Calendar, BarChart3, Users, DollarSign, Package, CreditCard, Receipt, Printer, Eye, FileText, ShoppingCart, User, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw, Loader2 } from "lucide-react"

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { DatePicker } from "@/components/ui/date-picker"
import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import axios from "axios"
import { Company } from "@/types"
import { toast } from "react-toastify"

export type SalesRecord = {
  id: string
  productId: string
  productName: string
  category: string
  customerName: string
  customerEmail: string
  quantity: number
  sellingPrice: number
  totalAmount: number
  costPrice: number
  profit: number
  profitMargin: number
  saleDate: Date
  paymentMethod: "credit_card" | "paypal" | "cash" | "bank_transfer"
  salesPerson: string
  transactionId: string
  status: "completed" | "pending" | "refunded" | "cancelled"
}

// Company settings type
type CompanySettings = {
  company_name: string
  address: string
  phone: string
  email: string
  return_policy: string
  thank_you_message: string
}

// Sale item type
interface SaleItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

// Transaction type for receipt
type TransactionForReceipt = {
  transaction_id: string
  date: string
  customer_name: string
  items: SaleItem[]
  subtotal: number
  discount_percentage?: number
  discount_amount?: number
  total_amount: number
  payment_method: string
  amount_received?: number
  change_amount?: number
}

// Extended Transaction type with details
interface Transaction {
  saleId: string
  transactionId: string
  date: Date
  customerName: string
  totalItems: number
  discountAmount: number
  subTotal: number
  grandTotal: number
  paymentMethod: string
  salesPerson: string
  status: "completed" | "pending" | "refunded" | "cancelled"
  customerEmail?: string
  productName?: string
  category?: string
  amountPaid?: number
  changeAmount?: number
  saleItems?: SaleItem[]
  notes?: string
  customerPhone?: string
  customerAddress?: string
}

interface RefundLineItem {
  id: number
  productName: string
  quantity: number
  refunded_quantity?: number
  price: number
  subtotal: number
}

type TopProductsData = {
  productName: string
  totalQuantity: number
  totalProfit: number
  category: string
  totalSales: number
}

type SalesByCategoryData = {
  category: string
  totalSales: number
}

interface Comp {
  name?: string
}

interface SalesReportPageProps {
  topProductsData: TopProductsData[]
  salesByCategoryData: SalesByCategoryData[]
  company?: Company
}
                
export const salesColumns: ColumnDef<SalesRecord>[] = [
  
  // ... (keep existing salesColumns the same)
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
    accessorKey: "saleDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sale Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("saleDate"))
      const formatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "productName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("productName")}</div>,
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.getValue("category")}</div>,
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => {
      const customerName = row.getValue("customerName") as string
      return (
        <div>
          <div className="font-medium">{customerName}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => {
      const quantity = parseInt(row.getValue("quantity"))
      return <div className="text-center font-medium">{quantity}</div>
    },
  },
  {
    accessorKey: "sellingPrice",
    header: "Selling Price",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("sellingPrice"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
      }).format(amount)
      return <div className="text-right">{formatted}</div>
    },
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Total Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
      }).format(amount)
      return <div className="text-right font-bold">{formatted}</div>
    },
  },
  {
    accessorKey: "profit",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Profit
          <TrendingUp className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const profit = parseFloat(row.getValue("profit"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
      }).format(profit)
      const isPositive = profit >= 0
      const className = `text-right font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`
      
      return (
        <div className={className}>
          {isPositive ? '+' : ''}{formatted}
        </div>
      )
    },
  },
  {
    accessorKey: "profitMargin",
    header: "Margin %",
    cell: ({ row }) => {
      const margin = parseFloat(row.getValue("profitMargin"))
      const className = margin >= 30 ? 'text-green-600 font-bold' : margin >= 20 ? 'text-orange-600' : 'text-red-600'
      return <div className={`text-right ${className}`}>{margin.toFixed(1)}%</div>
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment",
    cell: ({ row }) => {
      const method = row.getValue("paymentMethod") as string
      const getMethodLabel = (method: string) => {
        switch (method) {
          case "credit_card": return "Credit Card"
          case "paypal": return "PayPal"
          case "cash": return "Cash"
          case "bank_transfer": return "Bank Transfer"
          default: return method
        }
      }
      
      return (
        <Badge variant="outline" className="capitalize">
          {getMethodLabel(method)}
        </Badge>
      )
    },
  },
  {
    accessorKey: "salesPerson",
    header: "Sales Person",
    cell: ({ row }) => <div>{row.getValue("salesPerson")}</div>,
  },
 
]

const SalesReportPage = ({topProductsData, salesByCategoryData, company}: SalesReportPageProps) => {
  const { props } = usePage() as any
  const companyData = company || props.company
  
  // Transaction-specific columns (updated for Transaction type)
  const transactionColumns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "transactionId",
      header: "Transaction ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("transactionId")}</div>
      ),
    },
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const date = new Date(row.getValue("date"))
        const formatted = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        return <div className="font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("customerName")}</div>
          <div className="text-sm text-muted-foreground">{row.original.customerEmail || "No email"}</div>
        </div>
      ),
    },
    {
      accessorKey: "totalItems",
      header: "Items",
      cell: ({ row }) => (
        <div className="text-center font-medium">{row.getValue("totalItems")}</div>
      ),
    },
    {
      accessorKey: "grandTotal",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("grandTotal"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "GHS",
        }).format(amount)
        return <div className="text-right font-bold">{formatted}</div>
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment Method",
      cell: ({ row }) => {
        const method = row.getValue("paymentMethod") as string
        const getMethodIcon = (method: string) => {
          switch (method) {
            case "credit_card": return <CreditCard className="h-4 w-4" />
            case "paypal": return <Receipt className="h-4 w-4" />
            case "cash": return <DollarSign className="h-4 w-4" />
            case "bank_transfer": return <Receipt className="h-4 w-4" />
            default: return <CreditCard className="h-4 w-4" />
          }
        }
        
        const getMethodLabel = (method: string) => {
          switch (method) {
            case "credit_card": return "Credit Card"
            case "paypal": return "PayPal"
            case "cash": return "Cash"
            case "bank_transfer": return "Bank Transfer"
            default: return method
          }
        }
        
        return (
          <div className="flex items-center gap-2">
            {getMethodIcon(method)}
            <span className="text-sm">{getMethodLabel(method)}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const getStatusVariant = (status: string) => {
          switch (status) {
            case "completed": return "default"
            case "pending": return "secondary"
            case "refunded": return "outline"
            case "cancelled": return "destructive"
            default: return "outline"
          }
        }
        
        const getStatusIcon = (status: string) => {
          switch (status) {
            case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />
            case "pending": return <Clock className="h-4 w-4 text-yellow-600" />
            case "refunded": return <Receipt className="h-4 w-4 text-blue-600" />
            case "cancelled": return <XCircle className="h-4 w-4 text-red-600" />
            default: return <AlertCircle className="h-4 w-4" />
          }
        }
        
        return (
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <Badge variant={getStatusVariant(status)} className="capitalize">
              {status}
            </Badge>
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const transaction = row.original

        const printReceipt = async (transaction: Transaction) => {
          try {
            console.log(transaction);
            
            // Fetch sale items from backend
            const response = await axios.get(`/admin/api/sales/transactions/${transaction.saleId}/sale-items`)
            const saleItems: SaleItem[] = response.data;
            
            // Use company settings from props
            const companySettings: CompanySettings = {
              company_name: companyData?.company_name || "Your Company Name",
              address: companyData?.address || "123 Business Street, Accra",
              phone: companyData?.phone || "+233 123 456 789",
              email: companyData?.email || "info@company.com",
              return_policy: companyData?.return_policy || "Items can be returned within 7 days with original receipt",
              thank_you_message: companyData?.thank_you_message || "We appreciate your business! Please come again."
            }

            // Calculate subtotal from sale items if available
            const subtotalFromItems = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
            const calculatedSubtotal = subtotalFromItems > 0 ? subtotalFromItems : transaction.subTotal;

            // Format price helper function with type safety
            const formatPrice = (price: any) => {
              // Convert to number first, then format
              const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price)
              return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
            }

            // Prepare transaction data for receipt with proper number conversion
            const transactionForReceipt: TransactionForReceipt = {
              transaction_id: transaction.transactionId,
              date: new Date(transaction.date).toLocaleString(),
              customer_name: transaction.customerName,
              items: saleItems.length > 0 ? saleItems : [{
                name: transaction.productName || "Various Items",
                quantity: Number(transaction.totalItems),
                price: calculatedSubtotal / transaction.totalItems,
                subtotal: calculatedSubtotal
              }],
              subtotal: calculatedSubtotal,
              discount_amount: transaction.discountAmount,
              total_amount: transaction.grandTotal,
              payment_method: transaction.paymentMethod,
              amount_received: transaction.amountPaid, // Use actual amount paid
              change_amount: transaction.changeAmount // Use actual change amount
            }

            const receiptContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Receipt ${transactionForReceipt.transaction_id}</title>
                  <style>
                    @media print {
                      @page {
                        margin: 0;
                        size: auto;
                      }
                      body {
                        margin: 0;
                        padding: 20px 0;
                        display: flex;
                        justify-content: center;
                        min-height: auto;
                      }
                      .receipt-container {
                        margin: 0 auto;
                        transform: translateY(0);
                      }
                      .button-container,
                      .print-btn,
                      .close-btn {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                      }
                    }
                    
                    @media screen {
                      body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                      }
                    }
                    
                    .receipt-container {
                      font-family: 'Courier New', monospace, Arial, sans-serif;
                      font-size: 12px;
                      max-width: 280px;
                      width: 100%;
                      background: white;
                      padding: 20px;
                      box-shadow: 0 0 10px rgba(0,0,0,0.1);
                      margin: 0 auto;
                    }
                    
                    .store-info {
                      text-align: center;
                      margin-bottom: 15px;
                      padding-bottom: 10px;
                      border-bottom: 1px dashed #000;
                    }
                    
                    .receipt-title {
                      text-align: center;
                      margin: 10px 0;
                      font-weight: bold;
                      font-size: 14px;
                    }
                    
                    .line {
                      display: flex;
                      justify-content: space-between;
                      margin: 4px 0;
                      padding: 1px 0;
                    }
                    
                    .items-header {
                      font-weight: bold;
                      border-bottom: 1px solid #000;
                      padding-bottom: 5px;
                      margin: 10px 0 5px 0;
                    }
                    
                    .item-row {
                      display: flex;
                      margin: 4px 0;
                      padding: 2px 0;
                    }
                    
                    .item-name {
                      flex: 2;
                      text-align: left;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    }
                    
                    .item-qty-price {
                      flex: 1;
                      text-align: center;
                    }
                    
                    .item-total {
                      flex: 1;
                      text-align: right;
                    }
                    
                    .total-line {
                      font-weight: bold;
                      border-top: 2px dashed #000;
                      padding-top: 8px;
                      margin-top: 8px;
                    }
                    
                    .footer {
                      text-align: center;
                      margin-top: 20px;
                      padding-top: 10px;
                      border-top: 1px dashed #000;
                    }
                    
                    .thank-you {
                      text-align: center;
                      font-weight: bold;
                      margin: 15px 0;
                      padding: 10px 0;
                    }
                    
                    .button-container {
                      text-align: center;
                      margin-top: 20px;
                    }
                    
                    button {
                      padding: 10px 20px;
                      border: none;
                      border-radius: 5px;
                      cursor: pointer;
                      font-size: 12px;
                      margin: 0 5px;
                    }
                    
                    .print-btn {
                      background: #007bff;
                      color: white;
                    }
                    
                    .close-btn {
                      background: #6c757d;
                      color: white;
                    }
                  </style>
                </head>
                <body>
                  <div class="receipt-container">
                    <!-- Store Header -->
                    <div class="store-info">
                      <h2 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">${companySettings.company_name}</h2>
                      <p style="margin: 2px 0;">${companySettings.address}</p>
                      <p style="margin: 2px 0;">Tel: ${companySettings.phone}</p>
                      <p style="margin: 2px 0;">Email: ${companySettings.email}</p>
                    </div>

                    <!-- Receipt Title -->
                    <div class="receipt-title">
                      SALES RECEIPT
                    </div>

                    <!-- Transaction Info -->
                    <div class="line">
                      <span>Date:</span>
                      <span>${transactionForReceipt.date}</span>
                    </div>
                    <div class="line">
                      <span>Receipt #:</span>
                      <span>${transactionForReceipt.transaction_id}</span>
                    </div>
                    <div class="line">
                      <span>Customer:</span>
                      <span>${transactionForReceipt.customer_name}</span>
                    </div>
                    
                    <!-- Items Header -->
                    <div class="items-header">
                      <div class="item-row">
                        <span class="item-name">ITEM</span>
                        <span class="item-qty-price">QTY x PRICE</span>
                        <span class="item-total">TOTAL</span>
                      </div>
                    </div>
                    
                    <!-- Items List -->
                    ${transactionForReceipt.items.map(item => `
                      <div class="item-row">
                        <span class="item-name">${item.name}</span>
                        <span class="item-qty-price">${item.quantity} x GHS${formatPrice(item.price)}</span>
                        <span class="item-total">GHS${formatPrice(item.subtotal)}</span>
                      </div>
                    `).join('')}
                    
                    <!-- Totals Section -->
                    <div class="line">
                      <span>Subtotal:</span>
                      <span>GHS${formatPrice(transactionForReceipt.subtotal)}</span>
                    </div>
                    
                    ${transactionForReceipt.discount_amount && transactionForReceipt.discount_amount > 0 ? `
                      <div class="line">
                        <span>Discount:</span>
                        <span>-GHS${formatPrice(transactionForReceipt.discount_amount)}</span>
                      </div>
                    ` : ''}
                    
                    <div class="line total-line">
                      <span>TOTAL:</span>
                      <span>GHS${formatPrice(transactionForReceipt.total_amount)}</span>
                    </div>
                    
                    <!-- Payment Info -->
                    <div class="line">
                      <span>Payment Method:</span>
                      <span>${transactionForReceipt.payment_method.toUpperCase()}</span>
                    </div>
                    
                    ${transactionForReceipt.payment_method === 'cash' && transactionForReceipt.amount_received ? `
                      <div class="line">
                        <span>Amount Received:</span>
                        <span>GHS${formatPrice(transactionForReceipt.amount_received)}</span>
                      </div>
                      ${transactionForReceipt.change_amount ? `
                        <div class="line">
                          <span>Change:</span>
                          <span>GHS${formatPrice(transactionForReceipt.change_amount)}</span>
                        </div>
                      ` : ''}
                    ` : ''}

                    <!-- Thank You Message -->
                    <div class="thank-you">
                      ${companySettings.thank_you_message}
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                    ${companySettings.return_policy ? `<p style="margin: 5px 0;">Return Policy: ${companySettings.return_policy}</p>` : ''}
                    </div>
                  </div>

                    <!-- Print Buttons (screen only — hidden when printing) -->
                    <div class="button-container no-print">
                      <button type="button" class="print-btn" onclick="window.print()">Print Receipt</button>
                      <button type="button" class="close-btn" onclick="window.close()">Close</button>
                    </div>
                  
                  <script>
                    setTimeout(() => {
                      window.print();
                    }, 500);
                  </script>
                </body>
              </html>
            `

            // Open print window
            const printWindow = window.open('', '_blank', 'width=600,height=700')
            if (printWindow) {
              printWindow.document.write(receiptContent)
              printWindow.document.close()
              
              // Auto-close after print
              printWindow.onafterprint = () => {
                printWindow.close()
              }
            }
          } catch (error) {
            console.error('Error fetching sale items:', error);
            // Fallback to basic receipt if API call fails
            alert('Could not load detailed items. Printing basic receipt.');
            
            // Use fallback receipt logic
            const companySettings: CompanySettings = {
              company_name: companyData?.company_name || "Your Company Name",
              address: companyData?.address || "123 Business Street, Accra",
              phone: companyData?.phone || "+233 123 456 789",
              email: companyData?.email || "info@company.com",
              return_policy: companyData?.return_policy || "Items can be returned within 7 days with original receipt",
              thank_you_message: companyData?.thank_you_message || "We appreciate your business! Please come again."
            }

            const formatPrice = (price: any) => {
              const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price)
              return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
            }

            const transactionForReceipt: TransactionForReceipt = {
              transaction_id: transaction.transactionId,
              date: new Date(transaction.date).toLocaleString(),
              customer_name: transaction.customerName,
              items: [{
                name: transaction.productName || "Various Items",
                quantity: Number(transaction.totalItems),
                price: transaction.subTotal / transaction.totalItems,
                subtotal: transaction.subTotal
              }],
              subtotal: transaction.subTotal,
              discount_amount: transaction.discountAmount,
              total_amount: transaction.grandTotal,
              payment_method: transaction.paymentMethod,
              amount_received: transaction.amountPaid || transaction.grandTotal,
              change_amount: transaction.changeAmount || 0
            }

            const receiptContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Receipt ${transactionForReceipt.transaction_id}</title>
                  <style>
                    /* Same styles as above */
                  </style>
                </head>
                <body>
                  <!-- Same HTML structure as above -->
                </body>
              </html>
            `

            const printWindow = window.open('', '_blank', 'width=600,height=700')
            if (printWindow) {
              printWindow.document.write(receiptContent)
              printWindow.document.close()
              printWindow.onafterprint = () => {
                printWindow.close()
              }
            }
          }
        }

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
                onClick={() => printReceipt(transaction)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {transaction.status === "completed" && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => void openRefundDialog(transaction)}
                >
                  Process Refund
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [transactionSorting, setTransactionSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [transactionColumnFilters, setTransactionColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [transactionColumnVisibility, setTransactionColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [transactionsData, setTransactionsData] = React.useState<Transaction[]>([])
  const [transactionRowSelection, setTransactionRowSelection] = React.useState({})
  const [_topProducts, _setTopProducts] = React.useState<TopProductsData[]>(topProductsData ? topProductsData : [])
  const [salesByCategory, setSalesByCategory] = React.useState<SalesByCategoryData[]>(salesByCategoryData ? salesByCategoryData : [])
  const [salesDetailsDateRange, setSalesDetailsDateRange] = React.useState<{ from: Date | null; to: Date | null }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  })

  const [sales, setSales] = React.useState<SalesRecord[]>([])
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null)
  const [showTransactionModal, setShowTransactionModal] = React.useState(false)
  const [refundOpen, setRefundOpen] = React.useState(false)
  const [refundReason, setRefundReason] = React.useState("")
  const [refundQuantity, setRefundQuantity] = React.useState<Record<string, string>>({})
  const [refundSubmitting, setRefundSubmitting] = React.useState(false)
  const [refundItems, setRefundItems] = React.useState<RefundLineItem[]>([])
  const [refundItemsLoading, setRefundItemsLoading] = React.useState(false)
  const [refundTransaction, setRefundTransaction] = React.useState<Transaction | null>(null)

  // Sales details
  const salesDetails = async () => {
    const response = await axios.get('/admin/api/sales/sales-details')
    setSales(response.data);
  }

  React.useEffect(() => {
    salesDetails();
    transactions()
  }, [])

  const openRefundDialog = async (transaction: Transaction) => {
    setRefundTransaction(transaction)
    setRefundReason("")
    setRefundQuantity({})
    setRefundItems([])
    setRefundItemsLoading(true)
    setRefundOpen(true)

    try {
      const { data } = await axios.get<RefundLineItem[]>(`/admin/api/sales/transactions/${transaction.saleId}/sale-items`)
      const mappedItems = data.map((item) => {
        const quantity = Number(item.quantity ?? 0)
        const refundedQuantity = Number(item.refunded_quantity ?? 0)
        const availableQuantity = Math.max(0, quantity - refundedQuantity)

        return {
          id: item.id,
          productName: item.productName ?? item.product_name ?? 'Unknown product',
          quantity: availableQuantity,
          refunded_quantity: refundedQuantity,
          price: Number(item.price ?? 0),
          subtotal: Number(item.subtotal ?? item.total_amount ?? 0),
        }
      })

      setRefundItems(mappedItems)
      setRefundQuantity(
        Object.fromEntries(mappedItems.map((item) => [String(item.id), String(item.quantity)])),
      )
    } catch {
      toast.error('Unable to load transaction items for refund.')
      setRefundOpen(false)
    } finally {
      setRefundItemsLoading(false)
    }
  }

  const submitRefund = async () => {
    if (!refundTransaction) {
      return
    }

    const items = refundItems
      .map((item) => {
        const quantity = Number(refundQuantity[String(item.id)] ?? 0)
        if (!quantity || quantity <= 0) {
          return null
        }

        return {
          sale_item_id: item.id,
          quantity,
        }
      })
      .filter(Boolean)

    if (items.length === 0) {
      toast.error('Select at least one item to refund.')
      return
    }

    setRefundSubmitting(true)

    try {
      const { data } = await axios.post(`/admin/api/sales/transactions/${refundTransaction.saleId}/refund`, {
        reason: refundReason.trim() || undefined,
        items,
      })

      if (data.success) {
        toast.success(data.message ?? 'Refund processed successfully.')
        setRefundOpen(false)
        setRefundReason("")
        setRefundQuantity({})
        setRefundItems([])
        await transactions()
      } else {
        toast.error(data.message ?? 'Failed to process refund.')
      }
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) && error.response?.data?.message
        ? String(error.response.data.message)
        : 'Failed to process refund.'
      toast.error(message)
    } finally {
      setRefundSubmitting(false)
    }
  }

  // Transactions
  const transactions = async () => {
    const response = await axios.get('/admin/api/sales/transactions')
    setTransactionsData(response.data);
  }

  // Filtered sales data for the sales details table (with date range)
  const filteredSalesForTable = React.useMemo(() => {
    return sales.filter(sale => {
      if (!salesDetailsDateRange.from || !salesDetailsDateRange.to) return true
      const saleDate = new Date(sale.saleDate)
      return saleDate >= salesDetailsDateRange.from && saleDate <= salesDetailsDateRange.to
    })
  }, [sales, salesDetailsDateRange])

  // Main sales table (for filtered data in details tab)
  const filteredSalesTable = useReactTable({
    data: filteredSalesForTable,
    columns: salesColumns,
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

  // Transactions table - UPDATED to use transactionsData
  const transactionTable = useReactTable({
    data: transactionsData, // Now using transactionsData instead of sales
    columns: transactionColumns,
    onSortingChange: setTransactionSorting,
    onColumnFiltersChange: setTransactionColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setTransactionColumnVisibility,
    onRowSelectionChange: setTransactionRowSelection,
    state: {
      sorting: transactionSorting,
      columnFilters: transactionColumnFilters,
      columnVisibility: transactionColumnVisibility,
      rowSelection: transactionRowSelection,
    },
  })

  // Calculate summary statistics for sales (ALL TIME - from beginning to now)
  const summary = React.useMemo(() => {
    return sales.reduce((acc, sale) => {
      acc.totalSales += Number(sale.totalAmount)
      acc.totalProfit += Number(sale.profit)
      acc.totalItemsSold += sale.quantity
      acc.totalTransactions += 1
      return acc
    }, {
      totalSales: 0,
      totalProfit: 0,
      totalItemsSold: 0,
      totalTransactions: 0
    })
  }, [sales]) // Removed dateRange dependency

  // Calculate summary statistics for transactions (ALL TIME - from beginning to now)
  const transactionSummary = React.useMemo(() => {
    return transactionsData.reduce((acc, transaction) => {
      acc.totalRevenue += Number(transaction.grandTotal)
      acc.totalTransactions += 1
      acc.totalItems += transaction.totalItems
      acc.totalDiscount += transaction.discountAmount
      return acc
    }, {
      totalRevenue: 0,
      totalTransactions: 0,
      totalItems: 0,
      totalDiscount: 0
    })
  }, [transactionsData]) // Removed dateRange dependency

  // Calculate summary statistics for FILTERED sales (for table footer display)
  const filteredSalesSummary = React.useMemo(() => {
    return filteredSalesForTable.reduce((acc, sale) => {
      acc.totalSales += Number(sale.totalAmount)
      acc.totalProfit += Number(sale.profit)
      acc.totalItemsSold += sale.quantity
      acc.totalTransactions += 1
      return acc
    }, {
      totalSales: 0,
      totalProfit: 0,
      totalItemsSold: 0,
      totalTransactions: 0
    })
  }, [filteredSalesForTable])

  const categories = React.useMemo(() => {
    return Array.from(new Set(sales.map(sale => sale.category)))
  }, [sales])

  const salesPersons = React.useMemo(() => {
    return Array.from(new Set(sales.map(sale => sale.salesPerson)))
  }, [sales])

  const getActiveFiltersCount = () => {
    return columnFilters.filter(filter => 
      filter.value && (Array.isArray(filter.value) ? filter.value.length > 0 : filter.value !== "")
    ).length
  }

  const getTransactionActiveFiltersCount = () => {
    return transactionColumnFilters.filter(filter => 
      filter.value && (Array.isArray(filter.value) ? filter.value.length > 0 : filter.value !== "")
    ).length
  }

  const calculateTotalOfAllProducts = () => {
    return (salesByCategory.reduce((total, sales) => total + Number(sales.totalSales), 0));
  }

  const clearAllFilters = () => {
    setColumnFilters([])
  }

  const clearTransactionFilters = () => {
    setTransactionColumnFilters([])
  }

  const exportToCSV = () => {
    const headers = [
      'Sale Date',
      'Product',
      'Category',
      'Customer',
      'Quantity',
      'Selling Price',
      'Total Amount',
      'Profit',
      'Profit Margin',
      'Payment Method',
      'Sales Person'
    ].join(',')

    const csvData = sales.map(sale => [
      new Date(sale.saleDate).toLocaleDateString(),
      sale.productName,
      sale.category,
      sale.customerName,
      sale.quantity,
      sale.sellingPrice,
      sale.totalAmount,
      sale.profit,
      sale.profitMargin + '%',
      sale.paymentMethod,
      sale.salesPerson
    ].join(','))

    const csv = [headers, ...csvData].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportFilteredSalesToCSV = () => {
    const headers = [
      'Sale Date',
      'Product',
      'Category',
      'Customer',
      'Quantity',
      'Selling Price',
      'Total Amount',
      'Profit',
      'Profit Margin',
      'Payment Method',
      'Sales Person'
    ].join(',')

    const csvData = filteredSalesForTable.map(sale => [
      new Date(sale.saleDate).toLocaleDateString(),
      sale.productName,
      sale.category,
      sale.customerName,
      sale.quantity,
      sale.sellingPrice,
      sale.totalAmount,
      sale.profit,
      sale.profitMargin + '%',
      sale.paymentMethod,
      sale.salesPerson
    ].join(','))

    const csv = [headers, ...csvData].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `filtered-sales-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportTransactionsToCSV = () => {
    const headers = [
      'Transaction ID',
      'Date',
      'Customer',
      'Total Items',
      'Subtotal',
      'Discount',
      'Grand Total',
      'Payment Method',
      'Status',
      'Sales Person'
    ].join(',')

    const csvData = transactionsData.map(transaction => [
      transaction.transactionId,
      new Date(transaction.date).toLocaleString(),
      transaction.customerName,
      transaction.totalItems,
      transaction.subTotal,
      transaction.discountAmount,
      transaction.grandTotal,
      transaction.paymentMethod,
      transaction.status,
      transaction.salesPerson
    ].join(','))

    const csv = [headers, ...csvData].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full min-w-0 space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Sales Report</h1>
          <p className="text-muted-foreground">
            Analyze sales performance, track revenue, and monitor profitability
          </p>
        </div>
        
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export All Sales CSV
          </Button>
          <Button onClick={exportTransactionsToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export Transactions CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards - These show ALL TIME totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "GHS",
              }).format(summary.totalSales)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {summary.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.totalProfit >= 0 ? '+' : ''}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "GHS",
              }).format(summary.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalSales > 0 ? ((summary.totalProfit / summary.totalSales) * 100).toFixed(1) : 0}% profit margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItemsSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "GHS",
              }).format(summary.totalTransactions > 0 ? summary.totalSales / summary.totalTransactions : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Sales Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="details">Sales Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Products */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>
                  Best selling products by revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {_topProducts.map((product: any, index) => (
                    <div key={product.productName} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "GHS",
                          }).format(product.totalSales)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {product.totalQuantity} units
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>
                  Revenue distribution across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesByCategory.map(category => {
                    const percentage = calculateTotalOfAllProducts() > 0 ? (category.totalSales / calculateTotalOfAllProducts()) * 100 : 0
                    
                    return (
                      <div key={category.category} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{category.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "GHS",
                            }).format(category.totalSales)}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
         

          {/* Transaction Filters */}
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                {/* Transaction ID Search */}
                <div className="w-full lg:max-w-sm">
                  <Input
                    placeholder="Search by Transaction ID..."
                    value={(transactionTable.getColumn("transactionId")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                      transactionTable.getColumn("transactionId")?.setFilterValue(event.target.value)
                    }
                    className="w-full"
                  />
                </div>

                {/* Status Filter */}
                <div className="w-full lg:max-w-[200px]">
                  <Select
                    value={(transactionTable.getColumn("status")?.getFilterValue() as string) ?? "all"}
                    onValueChange={(value) => 
                      transactionTable.getColumn("status")?.setFilterValue(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Transaction Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2">
                {getTransactionActiveFiltersCount() > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearTransactionFilters}
                    className="h-9"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters ({getTransactionActiveFiltersCount()})
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
                    {transactionTable
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
                            {column.id === "transactionId" ? "Transaction ID" : 
                             column.id === "date" ? "Date & Time" :
                             column.id === "customerName" ? "Customer" :
                             column.id === "totalItems" ? "Items" :
                             column.id === "grandTotal" ? "Amount" :
                             column.id === "paymentMethod" ? "Payment Method" :
                             column.id === "status" ? "Status" :
                             column.id}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Active Filters Display */}
            {getTransactionActiveFiltersCount() > 0 && (
              <div className="flex flex-wrap gap-2">
                {transactionColumnFilters.map((filter, index) => {
                  if (!filter.value || (Array.isArray(filter.value) && filter.value.length === 0)) return null
                  
                  return (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {filter.id}: {Array.isArray(filter.value) ? filter.value.join(" - ") : filter.value.toString()}
                      <button
                        onClick={() => {
                          setTransactionColumnFilters(prev => prev.filter((_, i) => i !== index))
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

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                {transactionTable.getHeaderGroups().map((headerGroup) => (
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
                {transactionTable.getRowModel().rows?.length ? (
                  transactionTable.getRowModel().rows.map((row) => (
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
                      colSpan={transactionColumns.length}
                      className="h-24 text-center"
                    >
                      No transactions found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination and Selection Info */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="text-muted-foreground flex-1 text-sm">
              {transactionTable.getFilteredSelectedRowModel().rows.length} of{" "}
              {transactionTable.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => transactionTable.previousPage()}
                disabled={!transactionTable.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => transactionTable.nextPage()}
                disabled={!transactionTable.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>

          <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Process Refund</DialogTitle>
                <DialogDescription>
                  Choose the quantity to refund and add an optional reason.
                </DialogDescription>
              </DialogHeader>

              {refundItemsLoading ? (
                <div className="space-y-3 py-4">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-refund-reason">Reason (optional)</Label>
                    <Input
                      id="admin-refund-reason"
                      placeholder="Customer requested a refund"
                      value={refundReason}
                      onChange={(event) => setRefundReason(event.target.value)}
                    />
                  </div>

                  <div className="space-y-3 rounded-md border p-3">
                    {refundItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No refundable items found for this transaction.</p>
                    ) : (
                      refundItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              Available: {item.quantity}
                            </p>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={refundQuantity[String(item.id)] ?? ""}
                            onChange={(event) =>
                              setRefundQuantity((current) => ({
                                ...current,
                                [String(item.id)]: event.target.value,
                              }))
                            }
                            className="w-24"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setRefundOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void submitRefund()} disabled={refundSubmitting || refundItemsLoading}>
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
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {/* Filters Section - Date range only affects sales details table */}
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                {/* Date Range - Only for sales details table */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Date Range:</span>
                  <Input
                    type="date"
                    value={salesDetailsDateRange.from?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setSalesDetailsDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }))}
                    className="w-full"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={salesDetailsDateRange.to?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setSalesDetailsDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }))}
                    className="w-full"
                  />
                </div>

                {/* Product Search */}
                <div className="w-full lg:max-w-sm">
                  <Input
                    placeholder="Search products..."
                    value={(filteredSalesTable.getColumn("productName")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                      filteredSalesTable.getColumn("productName")?.setFilterValue(event.target.value)
                    }
                    className="w-full"
                  />
                </div>

                {/* Sales Person Filter */}
                <div className="w-full lg:max-w-[200px]">
                  <Select
                    value={(filteredSalesTable.getColumn("salesPerson")?.getFilterValue() as string) ?? "all"}
                    onValueChange={(value) => 
                      filteredSalesTable.getColumn("salesPerson")?.setFilterValue(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sales Person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sales Persons</SelectItem>
                      {salesPersons.map((person) => (
                        <SelectItem key={person} value={person}>
                          {person}
                        </SelectItem>
                      ))}
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
                    onClick={() => {
                      setColumnFilters([])
                    }}
                    className="h-9"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters ({getActiveFiltersCount()})
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportFilteredSalesToCSV}
                  className="h-9"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export Filtered CSV
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                      <Filter className="mr-2 h-4 w-4" />
                      Columns
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {filteredSalesTable
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
                            {column.id === "productName" ? "Product Name" : 
                             column.id === "saleDate" ? "Sale Date" :
                             column.id === "totalAmount" ? "Total Amount" :
                             column.id === "profitMargin" ? "Profit Margin" :
                             column.id === "paymentMethod" ? "Payment Method" :
                             column.id === "salesPerson" ? "Sales Person" :
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

          {/* Sales Table - Show filtered data based on date range */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                {filteredSalesTable.getHeaderGroups().map((headerGroup) => (
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
                {filteredSalesTable.getRowModel().rows?.length ? (
                  filteredSalesTable.getRowModel().rows.map((row) => (
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
                      colSpan={salesColumns.length}
                      className="h-24 text-center"
                    >
                      No sales records found for the selected date range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {/* Table Footer showing filtered totals */}
              <tfoot className="bg-muted/50">
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-bold">
                    Filtered Totals ({filteredSalesForTable.length} records):
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {filteredSalesSummary.totalItemsSold}
                  </TableCell>
                  <TableCell className="text-right">
                    -
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "GHS",
                    }).format(filteredSalesSummary.totalSales)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${filteredSalesSummary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {filteredSalesSummary.totalProfit >= 0 ? '+' : ''}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "GHS",
                    }).format(filteredSalesSummary.totalProfit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {filteredSalesSummary.totalSales > 0 ? 
                      ((filteredSalesSummary.totalProfit / filteredSalesSummary.totalSales) * 100).toFixed(1) + '%' : 
                      '0%'
                    }
                  </TableCell>
                  <TableCell colSpan={3}>
                    {/* Empty cells for remaining columns */}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>

          {/* Pagination and Selection Info */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="text-muted-foreground flex-1 text-sm">
              {filteredSalesTable.getFilteredSelectedRowModel().rows.length} of{" "}
              {filteredSalesTable.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => filteredSalesTable.previousPage()}
                disabled={!filteredSalesTable.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => filteredSalesTable.nextPage()}
                disabled={!filteredSalesTable.getCanNextPage()}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Reset date range to default (current month)
                  setSalesDetailsDateRange({
                    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    to: new Date()
                  })
                  setColumnFilters([])
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
  },
  {
    title: 'Sales Report',
    href: '/sales',
  },
];

export default function SalesReport({topProductsData, salesByCategoryData, company}: {topProductsData: TopProductsData[], salesByCategoryData: SalesByCategoryData[], company?: Company}) {

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Sales Report" />
      <div className="w-full px-10 lg:px-10 max-sm:px-6 ">
        <SalesReportPage 
          topProductsData={topProductsData} 
          salesByCategoryData={salesByCategoryData} 
          company={company}
        />
      </div>
    </AppLayout>
  );
}