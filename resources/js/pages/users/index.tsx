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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Filter, X, Plus, Mail, Phone, User, Shield, Calendar, CheckCircle, XCircle, Clock, Edit, Trash2, Key, Eye, Loader2, Archive } from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { BreadcrumbItem, FlashMessages } from '@/types';

import { ToastContainer, toast, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from "sweetalert2"
import axios from "axios"


export type User = {
  id: string
  name?: string
  email: string
  phone: string
  role: "supper admin" | "admin" | "cashier" | "inventory"
  position: string
  status: "active" | "inactive" | "pending" | "suspended"
  lastLogin: Date | null
  createdAt: Date
  avatar?: string
}

export const userColumns: ColumnDef<User>[] = [
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
    accessorKey: "firstName",
    header: "User",
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={`${user.name}`}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="font-medium">
              {user.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {user.position}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <div>
          <a 
            href={`mailto:${row.getValue("email")}`}
            className="hover:text-primary hover:underline"
          >
            {row.getValue("email")}
          </a>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <a 
          href={`tel:${row.getValue("phone")}`}
          className="hover:text-primary hover:underline"
        >
          {row.getValue("phone")}
        </a>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      const getRoleVariant = (role: string) => {
        switch (role) {
          case "admin": return "destructive"
          case "supper admin": return "destructive"
          case "cashier": return "default"
          case "inventory": return "secondary"
          default: return "outline"
        }
      }
      
      const getRoleIcon = (role: string) => {
        switch (role) {
          case "admin": return <Shield className="h-3 w-3 mr-1" />
          case "supper admin": return <Shield className="h-3 w-3 mr-1" />
          case "cashier": return <User className="h-3 w-3 mr-1" />
          case "inventory": return <Archive className="h-3 w-3 mr-1" />
          default: return <User className="h-3 w-3 mr-1" />
        }
      }
      
      return (
        <Badge variant={getRoleVariant(role)} className="capitalize">
          {getRoleIcon(role)}
          {role}
        </Badge>
      )
    },
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === "all") return true
      return row.getValue(columnId) === filterValue
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "active": return "default"
          case "inactive": return "secondary"
          case "pending": return "outline"
          case "suspended": return "destructive"
          default: return "outline"
        }
      }
      
      const getStatusIcon = (status: string) => {
        switch (status) {
          case "active": return <CheckCircle className="h-3 w-3 mr-1" />
          case "inactive": return <XCircle className="h-3 w-3 mr-1" />
          case "pending": return <Clock className="h-3 w-3 mr-1" />
          case "suspended": return <XCircle className="h-3 w-3 mr-1" />
          default: return <Clock className="h-3 w-3 mr-1" />
        }
      }
      
      return (
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${
            status === 'active' ? 'bg-green-500' :
            status === 'inactive' ? 'bg-gray-500' :
            status === 'pending' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
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
    accessorKey: "lastLogin",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Login
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.original.lastLogin
      if (!date) return <div className="text-muted-foreground">Never</div>
      
      const formatted = new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      
      const today = new Date()
      const loginDate = new Date(date)
      const diffTime = Math.abs(today.getTime() - loginDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      let className = ""
      if (diffDays > 30) {
        className = "text-orange-600"
      } else if (diffDays > 7) {
        className = "text-yellow-600"
      }
      
      return <div className={className}>{formatted}</div>
    },
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      const formatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      return <div>{formatted}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original

      return (
        <UserActions user={user} onUserUpdate={() => {}} />
      )
    },
  },
]

// User Actions Component with Dialogs
interface UserActionsProps {
  user: User
  onUserUpdate: () => void
}

const UserActions = ({ user, onUserUpdate }: UserActionsProps) => {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = React.useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = React.useState(false)
  const [isStatusLoading, setIsStatusLoading] = React.useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = React.useState(false)
  const [roles, setRoles] = React.useState<Role[]>([])

  React.useEffect( () => {
     allRoles();  
  }, [])

  const allRoles = async () => {
    try {
      const response =  await axios.get('/admin/api/roles/all-roles');
      if (response.status = 200) {
        setRoles(response.data)
      }
    } catch (errors) {
      console.error('Error occures: ', errors);
    }
  }

  // Edit User Form
  const {data: editUserData, setData: setEditUserData, put: updateUser, errors: editErrors, processing: editProcessing} = useForm({
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
  })

  // Reset Password Form
  const {data: resetPasswordData, setData: setResetPasswordData, post: resetPassword, errors: resetErrors, processing: resetProcessing} = useForm({
    newPassword: '',
    confirmPassword: '',
  })

  const handleEditUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateUser(`users/${user.id}`, {
      onSuccess: () => {
        toast.success('User updated successfully!')
        setIsEditUserOpen(false)
        // Call the parent's update function to refresh users without page reload
        onUserUpdate()
      },
      onError: (errors) => {
        console.error(errors)
      },
    })
  }

  const handleResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      toast.error('Passwords do not match!')
      return
    }

    resetPassword(`users/${user.id}/reset-password`, {
      onSuccess: () => {
        toast.success('Password reset successfully!')
        setIsResetPasswordOpen(false)
        setResetPasswordData({ newPassword: '', confirmPassword: '' })
      },
      onError: (errors) => {
        console.error(errors)
      },
    })
  }

  const handleStatusToggle = async () => {
    setIsStatusLoading(true)
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active'
      // Use PUT request to update status
      const response = await axios.get(`/admin/api/users/${user.id}/status`)
      if (response.status === 200) {
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
        // Call the parent's update function to refresh users without page reload
        onUserUpdate()
      } else {
        toast.error('Failed to update user status')
      }
    } catch (error) {
      toast.error('Failed to update user status')
    } finally {
      setIsStatusLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${user.name}. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsDeleteLoading(true)
        try {
          // Use DELETE request to delete user
          const response = await axios.delete(`/admin/users/${user.id}`)
          if (response.status === 200) {
            toast.success('User deleted successfully!')
            // Call the parent's update function to refresh users without page reload
            onUserUpdate()
          } else {
            toast.error('Failed to delete user')
          }
        } catch (error) {
          toast.error('Failed to delete user')
        } finally {
          setIsDeleteLoading(false)
        }
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          
          {/* View Profile */}
          <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </DropdownMenuItem>
          
          {/* Edit User */}
          <DropdownMenuItem onClick={() => setIsEditUserOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit User
          </DropdownMenuItem>
          
          {/* Reset Password */}
          <DropdownMenuItem onClick={() => setIsResetPasswordOpen(true)}>
            <Key className="h-4 w-4 mr-2" />
            Reset Password
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Toggle Status */}
          {user.status === "active" ? (
            <DropdownMenuItem 
              onClick={handleStatusToggle} 
              className="text-orange-600"
              disabled={isStatusLoading}
            >
              {isStatusLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {isStatusLoading ? 'Updating...' : 'Deactivate User'}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={handleStatusToggle} 
              className="text-green-600"
              disabled={isStatusLoading}
            >
              {isStatusLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isStatusLoading ? 'Updating...' : 'Activate User'}
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Delete User */}
          <DropdownMenuItem 
            onClick={handleDeleteUser} 
            className="text-red-600"
            disabled={isDeleteLoading}
          >
            {isDeleteLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {isDeleteLoading ? 'Deleting...' : 'Delete User'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Preview Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              View user details and information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={`${user.name}`}
                    className="h-16 w-16 rounded-full"
                  />
                ) : (
                  <User className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <p className="text-muted-foreground">{user.position}</p>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                  {user.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p className="text-sm">{user.phone}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <p className="text-sm capitalize">{user.role}</p>
              </div>
          
              <div>
                <Label className="text-sm font-medium">Last Login</Label>
                <p className="text-sm">
                  {user.lastLogin 
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Member Since</Label>
              <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[550px] lg:h-auto sm:h-auto overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    placeholder="John Doe"
                    value={editUserData.name}
                    onChange={(e) => setEditUserData('name', e.target.value)}
                  />
                  {editErrors.name && <p className="text-red-500 text-sm">{editErrors.name}</p>}
                </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData('email', e.target.value)}
                  placeholder="user@company.com"
                />
                {editErrors.email && <p className="text-red-500 text-sm">{editErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  value={editUserData.phone}
                  onChange={(e) => setEditUserData('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
                {editErrors.phone && <p className="text-red-500 text-sm">{editErrors.phone}</p>}
              </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={editUserData.role} onValueChange={(value: "supper admin" | "admin" | "cashier" | "inventory") => setEditUserData('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => 
                      <SelectItem style={{ textTransform: 'capitalize' }} key={role.id} value={role.name}>{role.name}</SelectItem>
                      
                    )}
                  </SelectContent>
                </Select>
              </div>
             
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={editProcessing}
              >
                {editProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {user.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData('newPassword', e.target.value)}
                  placeholder="Enter new password"
                />
                {resetErrors.newPassword && <p className="text-red-500 text-sm">{resetErrors.newPassword}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData('confirmPassword', e.target.value)}
                  placeholder="Confirm new password"
                />
                {resetErrors.confirmPassword && <p className="text-red-500 text-sm">{resetErrors.confirmPassword}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={resetProcessing}
              >
                {resetProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface UserForm {
  name: string
  email: string
  phone: string
  role: "supper admin" | "admin" | "cashier" | "inventory" 
  position: string
  department: string
  location: string
  status: "active" | "inactive"
  password: string
  password_confirmation: string
}

interface ResetPasswordForm {
  newPassword: string
  confirmPassword: string
}

interface Role {
  id: string
  name: string
}

interface UserIndexPageProps {
  usersData: User[]
}

const UserIndexPage = ({usersData}: UserIndexPageProps) => {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false)
  const [users, setUsers] = React.useState<User[]>(usersData)
  const [activeTab, setActiveTab] = React.useState("all")
  const [isLoading, setIsLoading] = React.useState(false)
  const [roles, setRoles] = React.useState<Role[]>([])
  const {flash} = usePage().props as {flash?: FlashMessages};

  React.useEffect( () => {
     allRoles();  
  }, [])

  const allRoles = async () => {
    try {
      const response =  await axios.get('/admin/api/roles/all-roles');
      if (response.status = 200) {
        setRoles(response.data)
      }
    } catch (errors) {
      console.error('Error occures: ', errors);
    }
  }

  // Add User Form
  const {data: addUserData, setData: setAddUserData, post, errors, processing, reset: resetAddUserForm} = useForm<UserForm>({
    name: '',
    email: '',
    phone: '',
    role: 'supper admin',
    position: '',
    department: '',
    location: '',
    status: 'active',
    password: '',
    password_confirmation: '',
  });

  const table = useReactTable({
    data: users,
    columns: userColumns,
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
    return users.reduce((acc, user) => {
      acc.totalUsers += 1
      if (user.status === 'active') acc.activeUsers += 1
      if (user.status === 'inactive') acc.inactiveUsers += 1
      if (user.status === 'pending') acc.pendingUsers += 1
      if (user.role === 'admin') acc.adminUsers += 1
      if (user.role === 'cashier') acc.cashierUsers += 1
      return acc
    }, {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      pendingUsers: 0,
      adminUsers: 0,
      cashierUsers: 0,
    })
  }, [users])

  const getActiveFiltersCount = () => {
    return columnFilters.filter(filter => 
      filter.value && (Array.isArray(filter.value) ? filter.value.length > 0 : filter.value !== "")
    ).length
  }

  const clearAllFilters = () => {
    setColumnFilters([])
  }

  const allUsers = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get('/admin/api/sales/all-users');
      if (response.status === 200) {
        setUsers(response.data)
      }
    } catch (error) {
      console.error('An error occurred: ', error);
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    post('/admin/users', {
      onSuccess: () => {
        toast.success('User added successfully!');
        setIsAddUserOpen(false)
        resetAddUserForm()
        allUsers();
      },
      onError: (errors) => {
        console.error(errors);
      },
    })
  }

  // Refresh users when component mounts
  React.useEffect(() => {
    allUsers()
  }, [])

  // Update the actions column to pass the onUserUpdate callback
  const updatedUserColumns = React.useMemo(() => {
    return userColumns.map(column => {
      if (column.id === "actions") {
        return {
          ...column,
          cell: ({ row }: any) => {
            const user = row.original
            return <UserActions user={user} onUserUpdate={allUsers} />
          },
        }
      }
      return column
    })
  }, [])

  const updatedTable = useReactTable({
    data: users,
    columns: updatedUserColumns,
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

  return (
    <div className="w-full">
      {/* Header with Add User Button */}
      <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, permissions, and access levels
          </p>
        </div>
        
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] lg:h-auto sm:h-auto overflow-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with an initial password. Share credentials securely with the user.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={addUserData.name}
                    onChange={(e) => setAddUserData('name', e.target.value)}
                  />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                </div>
              
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={addUserData.email}
                    onChange={(e) => setAddUserData('email', e.target.value)}
                    placeholder="user@company.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={addUserData.phone}
                    onChange={(e) => setAddUserData('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={addUserData.password}
                      onChange={(e) => setAddUserData('password', e.target.value)}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                    <Input
                      id="password_confirmation"
                      name="password_confirmation"
                      type="password"
                      value={addUserData.password_confirmation}
                      onChange={(e) => setAddUserData('password_confirmation', e.target.value)}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select  value={addUserData.role} onValueChange={(value: "supper admin" | "admin" | "cashier" | "inventory" ) => setAddUserData('role', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => 
                          <SelectItem style={{ textTransform: 'capitalize' }} key={role.id} value={role.name}>{role.name}</SelectItem>
                          
                        )}
                        
                      </SelectContent>
                    </Select>
                    {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={addUserData.status} onValueChange={(value: "active" | "inactive") => setAddUserData('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
                  </div>
                </div>
                
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white" 
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summary.inactiveUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.adminUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <div className="space-y-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
            {/* User Search */}
            <div className="w-full lg:max-w-sm">
              <Input
                placeholder="Search users..."
                value={(updatedTable.getColumn("firstName")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  updatedTable.getColumn("firstName")?.setFilterValue(event.target.value)
                }
                className="w-full"
              />
            </div>

            {/* Role Filter */}
            <div className="w-full lg:max-w-[200px]">
              <Select
                value={(updatedTable.getColumn("role")?.getFilterValue() as string) ?? "all"}
                onValueChange={(value) => 
                  updatedTable.getColumn("role")?.setFilterValue(value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem className="text-uppercase" style={{ textTransform: 'capitalize' }} key={role.id} value={role.name}>{role.name}</SelectItem>
                  ))}
                  
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:max-w-[200px]">
              <Select
                value={(updatedTable.getColumn("status")?.getFilterValue() as string) ?? "all"}
                onValueChange={(value) => 
                  updatedTable.getColumn("status")?.setFilterValue(value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
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
                {updatedTable
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
                        {column.id === "firstName" ? "User" : 
                         column.id === "lastLogin" ? "Last Login" :
                         column.id === "createdAt" ? "Joined Date" :
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
            {updatedTable.getHeaderGroups().map((headerGroup) => (
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={userColumns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading users...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : updatedTable.getRowModel().rows?.length ? (
              updatedTable.getRowModel().rows.map((row) => (
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
                  colSpan={userColumns.length}
                  className="h-24 text-center"
                >
                  No users found. Try adjusting your filters or{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={() => setIsAddUserOpen(true)}
                  >
                    add a new user
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
          {updatedTable.getFilteredSelectedRowModel().rows.length} of{" "}
          {updatedTable.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updatedTable.previousPage()}
            disabled={!updatedTable.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updatedTable.nextPage()}
            disabled={!updatedTable.getCanNextPage()}
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
  )
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
  },
  {
    title: 'User Management',
    href: '/users',
  },
];

export default function UserManagement({usersData}: any) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="User Management" />
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10">
        <UserIndexPage usersData={usersData} />
      </div>
    </AppLayout>
  );
}