import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  Download,
  Loader2,
  User,
  Receipt,
  Clock
} from 'lucide-react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
// import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

interface SalesData {
  date: string;
  sales: number;
  transactions: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface Transaction {
  id: string;
  time: string;
  items: number;
  amount: number;
  payment: string;
}

interface CashierDashboardData {
  cashierInfo: {
    name: string;
    id: string;
    shiftStart: string;
    shiftDuration: string;
    totalShifts: number;
    rating: number;
  };
  shiftMetrics: Array<{
    title: string;
    value: string;
    change: number;
  }>;
  shiftSalesTrend: SalesData[];
  shiftCategoryData: CategoryData[];
  shiftTopProducts: TopProduct[];
  recentShiftTransactions: Transaction[];
  dailyPerformance: Array<{
    day: string;
    sales: number;
    target: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon }) => {
  const isPositive = change >= 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center pt-1">
          <Badge 
            variant={isPositive ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {isPositive ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </Badge>
          <span className="text-xs text-muted-foreground ml-2">from previous shift</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Utility function to download content
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const CashierDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [dashboardData, setDashboardData] = useState<CashierDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch dashboard data from backend
  const fetchDashboardData = async (range: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/cashier/api/cashier/dashboard?timeRange=${range}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response || response.status !== 200) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = response.data as CashierDashboardData;
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(timeRange);
  }, [timeRange]);

  // Refresh data
  const handleRefresh = () => {
    fetchDashboardData(timeRange);
  };

  // Download chart data as CSV
  const downloadChartDataAsCSV = (data: any[] | undefined, filename: string, chartName: string) => {
    try {
      setDownloading(`${chartName}-csv`);
      
      if (!data || data.length === 0) {
        alert('No data available to download');
        return;
      }
  
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(item => 
        Object.values(item).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      downloadBlob(blob, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error downloading chart data:', error);
      alert(`Error downloading ${chartName} data as CSV. Please try again.`);
    } finally {
      setDownloading(null);
    }
  };

  // Download table as CSV
  const downloadTableAsCSV = (data: any[], filename: string, columns: string[], chartName: string) => {
    try {
      setDownloading(`${chartName}-csv`);
      
      if (!data || data.length === 0) {
        alert('No data available to download');
        return;
      }

      const headers = columns.join(',');
      const rows = data.map(item => 
        columns.map(col => {
          const value = item[col];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      downloadBlob(blob, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error downloading table:', error);
      alert(`Error downloading ${chartName} as CSV. Please try again.`);
    } finally {
      setDownloading(null);
    }
  };

  // Sample data as fallback
  const sampleData: CashierDashboardData = {
    cashierInfo: {
      name: "John Doe",
      id: "CSH-001",
      shiftStart: "08:00 AM",
      shiftDuration: "8h 30m",
      totalShifts: 156,
      rating: 4.8
    },
    shiftMetrics: [
      { title: "Today's Sales", value: "GHS 0.00", change: 0 },
      { title: "Transactions", value: "0", change: 0 },
      { title: "Avg Transaction", value: "GHS 0.00", change: 0 },
      { title: "Items Sold", value: "0", change: 0 },
      { title: "Refunds", value: "0", change: 0 },
      { title: "Void Items", value: "0", change: 0 },
      { title: "Customer Rating", value: "4.8", change: 0 },
      { title: "Shift Duration", value: "8h 30m", change: 0 },
    ],
    shiftSalesTrend: [],
    shiftCategoryData: [],
    shiftTopProducts: [],
    recentShiftTransactions: [],
    dailyPerformance: [],
    paymentMethods: []
  };

  const data = dashboardData || sampleData;

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-0 pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4 ml-auto" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Cashier Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {data.cashierInfo.name}!</p>
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                ID: {data.cashierInfo.id}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Shift Started: {data.cashierInfo.shiftStart}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                Total Shifts: {data.cashierInfo.totalShifts}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => downloadChartDataAsCSV(data.shiftSalesTrend, 'shift-sales-trend', 'Shift Sales Trend')}>
                  Sales Trend CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadChartDataAsCSV(data.shiftCategoryData, 'category-distribution', 'Category Distribution')}>
                  Category Distribution CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadTableAsCSV(data.recentShiftTransactions, 'recent-transactions', ['id', 'time', 'items', 'amount', 'payment'], 'Recent Transactions')}>
                  Recent Transactions CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              onClick={handleRefresh} 
              disabled={loading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as 'today' | 'week' | 'month')}>
          <TabsList>
            <TabsTrigger value="today">Today's Shift</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Cashier Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Cashier ID:</span>
                  <span className="font-bold">{data.cashierInfo.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Current Shift:</span>
                  <span>{data.cashierInfo.shiftDuration}</span>
                </div>
                <div className="pt-2">
                  <span className="font-medium">Rating: </span>
                  <div className="inline-flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`text-xl ${i < Math.floor(data.cashierInfo.rating) ? 'text-yellow-500' : 'text-gray-300'}`}>
                        ★
                      </span>
                    ))}
                    <span className="ml-2 font-bold">{data.cashierInfo.rating}/5.0</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Shift Performance</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Sales Target</span>
                    <span className="font-medium">GHS 5,000</span>
                  </div>
                  <Progress value={65} className="h-2" />
                  <div className="text-xs text-muted-foreground">65% completed</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Quick Actions</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline">
                    <Receipt className="mr-2 h-4 w-4" />
                    New Sale
                  </Button>
                  <Button size="sm" variant="outline">
                    View All Transactions
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Today's Sales"
            value={data.shiftMetrics[0]?.value || "GHS 0.00"}
            change={data.shiftMetrics[0]?.change || 0}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Transactions"
            value={data.shiftMetrics[1]?.value || "0"}
            change={data.shiftMetrics[1]?.change || 0}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Transaction"
            value={data.shiftMetrics[2]?.value || "GHS 0.00"}
            change={data.shiftMetrics[2]?.change || 0}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            title="Items Sold"
            value={data.shiftMetrics[3]?.value || "0"}
            change={data.shiftMetrics[3]?.change || 0}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <MetricCard
            title="Refunds"
            value={data.shiftMetrics[4]?.value || "0"}
            change={data.shiftMetrics[4]?.change || 0}
            icon={<ArrowDown className="h-4 w-4" />}
          />
          <MetricCard
            title="Void Items"
            value={data.shiftMetrics[5]?.value || "0"}
            change={data.shiftMetrics[5]?.change || 0}
            icon={<Receipt className="h-4 w-4" />}
          />
          <MetricCard
            title="Customer Rating"
            value={data.shiftMetrics[6]?.value || "0.0"}
            change={data.shiftMetrics[6]?.change || 0}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Shift Duration"
            value={data.shiftMetrics[7]?.value || "0h 0m"}
            change={data.shiftMetrics[7]?.change || 0}
            icon={<Clock className="h-4 w-4" />}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Shift Sales Trend</CardTitle>
                <Button
                  onClick={() => downloadChartDataAsCSV(data.shiftSalesTrend, 'shift-sales-trend', 'Shift Sales Trend')}
                  disabled={downloading !== null || data.shiftSalesTrend.length === 0}
                  variant="ghost"
                  size="sm"
                >
                  {downloading === 'Shift Sales Trend-csv' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {data.shiftSalesTrend.length > 0 ? (
                  <LineChart data={data.shiftSalesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                      formatter={(value) => [`GHS ${Number(value).toLocaleString()}`, 'Sales']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Sales (GHS)"
                    />
                  </LineChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No sales data available for this shift</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales by Category</CardTitle>
                <Button
                  onClick={() => downloadChartDataAsCSV(data.shiftCategoryData, 'category-distribution', 'Category Distribution')}
                  disabled={downloading !== null || data.shiftCategoryData.length === 0}
                  variant="ghost"
                  size="sm"
                >
                  {downloading === 'Category Distribution-csv' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {data.shiftCategoryData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={data.shiftCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.shiftCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  </PieChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No category data available</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Performance</CardTitle>
                <Button
                  onClick={() => downloadChartDataAsCSV(data.dailyPerformance, 'daily-performance', 'Daily Performance')}
                  disabled={downloading !== null || data.dailyPerformance.length === 0}
                  variant="ghost"
                  size="sm"
                >
                  {downloading === 'Daily Performance-csv' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {data.dailyPerformance.length > 0 ? (
                  <BarChart data={data.dailyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                      formatter={(value) => [`GHS ${Number(value).toLocaleString()}`, 'Sales']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="sales" 
                      fill="#10B981" 
                      name="Actual Sales"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="target" 
                      fill="#F59E0B" 
                      name="Target Sales"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No daily performance data available</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment Methods</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.paymentMethods.length > 0 ? (
                  data.paymentMethods.map((payment, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{payment.method}</span>
                        <span className="text-sm text-muted-foreground">
                          {payment.count} transactions • GHS {payment.amount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={payment.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">{payment.percentage.toFixed(1)}% of total</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No payment data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Selling Products</CardTitle>
                <Button
                  onClick={() => downloadTableAsCSV(data.shiftTopProducts, 'top-products', ['name', 'quantity', 'revenue'], 'Top Products')}
                  disabled={downloading !== null || data.shiftTopProducts.length === 0}
                  variant="ghost"
                  size="sm"
                >
                  {downloading === 'Top Products-csv' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.shiftTopProducts.length > 0 ? (
                  data.shiftTopProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <p className="font-medium leading-none">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.quantity} units sold</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">GHS {product.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No product data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Button
                  onClick={() => downloadTableAsCSV(data.recentShiftTransactions, 'recent-transactions', ['id', 'time', 'items', 'amount', 'payment'], 'Recent Transactions')}
                  disabled={downloading !== null || data.recentShiftTransactions.length === 0}
                  variant="ghost"
                  size="sm"
                >
                  {downloading === 'Recent Transactions-csv' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentShiftTransactions.length > 0 ? (
                    data.recentShiftTransactions.map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{transaction.id}</TableCell>
                        <TableCell>{transaction.time}</TableCell>
                        <TableCell>{transaction.items}</TableCell>
                        <TableCell className="font-semibold">GHS {transaction.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.payment}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No recent transactions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'CashierDashboard',
        href: '/dashboard',
    },
];

export default function CashierDashboard2() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
              
          <CashierDashboard />
        </AppLayout>
    );
}
