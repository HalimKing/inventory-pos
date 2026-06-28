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
  Loader2
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

interface DashboardData {
  metrics: Array<{
    title: string;
    value: string;
    change: number;
  }>;
  salesTrend: SalesData[];
  categoryData: CategoryData[];
  topProducts: TopProduct[];
  recentTransactions: Transaction[];
  last30DaysSales: SalesData[];
  financialYearSales: Array<{
    month: string;
    sales: number;
    target: number;
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
          <span className="text-xs text-muted-foreground ml-2">from previous period</span>
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

const POSDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch dashboard data from backend
  const fetchDashboardData = async (range: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/admin/api/dashboard/data?timeRange=${range}`);
      
      if (!response || response.status !== 200) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = response.data as DashboardData;
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

      // Convert data to CSV format
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

  // Download all charts as CSV
  const downloadAllChartsAsCSV = () => {
    const charts = [
      { name: 'sales-trend', displayName: 'Sales Trend', data: dashboardData?.salesTrend },
      { name: 'category-distribution', displayName: 'Category Distribution', data: dashboardData?.categoryData },
      { name: 'last-30-days-sales', displayName: 'Last 30 Days Sales', data: dashboardData?.last30DaysSales },
      { name: 'financial-year-sales', displayName: 'Financial Year Sales', data: dashboardData?.financialYearSales },
    ];

    charts.forEach((chart, index) => {
      if (chart.data && chart.data.length > 0) {
        setTimeout(() => {
          downloadChartDataAsCSV(chart.data, chart.name, chart.displayName);
        }, index * 500);
      }
    });
  };

  // Sample data as fallback - remove this in production
  const sampleData: DashboardData = {
    metrics: [
      { title: "Today's Sales", value: "GHS 0.00", change: 0 },
      { title: "Yesterday's Sales", value: "GHS 0.00", change: 0 },
      { title: "Total Revenue", value: "GHS 0.00", change: 0 },
      { title: "Total Products", value: "0", change: 0 },
      { title: "Transactions", value: "0", change: 0 },
      { title: "Avg Transaction", value: "GHS 0.00", change: 0 },
      { title: "Customers", value: "0", change: 0 },
      { title: "Users", value: "0", change: 0 },
    ],
    salesTrend: [],
    categoryData: [],
    topProducts: [],
    recentTransactions: [],
    last30DaysSales: [],
    financialYearSales: []
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
          
          <Tabs defaultValue="7d" className="w-full max-w-md">
            <TabsList>
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </TabsList>
          </Tabs>

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
            <h1 className="text-3xl font-bold tracking-tight">POS Analytics Dashboard</h1>
            <p className="text-muted-foreground">Real-time insights into your store performance</p>
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
                <DropdownMenuItem onClick={downloadAllChartsAsCSV}>
                  Download All CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadChartDataAsCSV(data.salesTrend, 'sales-trend', 'Sales Trend')}>
                  Sales Trend CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadChartDataAsCSV(data.categoryData, 'category-distribution', 'Category Distribution')}>
                  Category Distribution CSV
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
        <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as '7d' | '30d' | '90d')}>
          <TabsList>
            <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
            <TabsTrigger value="90d">Last 90 Days</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Today's Sales"
            value={data.metrics[0]?.value || "GHS 0.00"}
            change={data.metrics[0]?.change || 0}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Yesterday's Sales"
            value={data.metrics[1]?.value || "GHS 0.00"}
            change={data.metrics[1]?.change || 0}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Revenue"
            value={data.metrics[2]?.value || "GHS 0.00"}
            change={data.metrics[2]?.change || 0}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Products"
            value={data.metrics[3]?.value || "0"}
            change={data.metrics[3]?.change || 0}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <MetricCard
            title="Transactions"
            value={data.metrics[4]?.value || "0"}
            change={data.metrics[4]?.change || 0}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Transaction"
            value={data.metrics[5]?.value || "GHS 0.00"}
            change={data.metrics[5]?.change || 0}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            title="Customers"
            value={data.metrics[6]?.value || "0"}
            change={data.metrics[6]?.change || 0}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Users"
            value={data.metrics[7]?.value || "0"}
            change={data.metrics[7]?.change || 0}
            icon={<Users className="h-4 w-4" />}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales Trend</CardTitle>
                <Button
                  onClick={() => downloadChartDataAsCSV(data.salesTrend, 'sales-trend', 'Sales Trend')}
                  disabled={downloading !== null || data.salesTrend.length === 0}
                  variant="ghost"
                  size="sm"
                >
                  {downloading === 'Sales Trend-csv' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {data.salesTrend.length > 0 ? (
                  <LineChart data={data.salesTrend}>
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
                    <p className="text-muted-foreground">No sales data available</p>
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
                  onClick={() => downloadChartDataAsCSV(data.categoryData, 'category-distribution', 'Category Distribution')}
                  disabled={downloading !== null || data.categoryData.length === 0}
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
                {data.categoryData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={data.categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.categoryData.map((entry, index) => (
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

        {/* Charts Row 2 - New Charts */}
        <div className="grid grid-cols-1 gap-6">
          {/* Sales Last 30 Days */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales Last 30 Days</CardTitle>
                <Button
                  onClick={() => downloadChartDataAsCSV(data.last30DaysSales, 'last-30-days-sales', 'Last 30 Days Sales')}
                  disabled={downloading !== null || data.last30DaysSales.length === 0}
                  variant="ghost"
                  size="sm"
                >
                  {downloading === 'Last 30 Days Sales-csv' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {data.last30DaysSales.length > 0 ? (
                  <BarChart data={data.last30DaysSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                      formatter={(value) => [`GHS ${Number(value).toLocaleString()}`, 'Sales']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="sales" 
                      fill="#10B981" 
                      name="Sales (GHS)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No 30-day sales data available</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Current Financial Year Sales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Financial Year Sales</CardTitle>
                <Button
                  onClick={() => downloadChartDataAsCSV(data.financialYearSales, 'financial-year-sales', 'Financial Year Sales')}
                  disabled={downloading !== null || data.financialYearSales.length === 0}
                  variant="ghost"
                  size="sm"
                >
                  {downloading === 'Financial Year Sales-csv' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {data.financialYearSales.length > 0 ? (
                  <LineChart data={data.financialYearSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                      formatter={(value) => [`GHS ${Number(value).toLocaleString()}`, 'Sales']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Actual Sales"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#F59E0B', r: 4 }}
                      name="Target Sales"
                    />
                  </LineChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No financial year data available</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Selling Products</CardTitle>
                <Button
                  onClick={() => downloadTableAsCSV(data.topProducts, 'top-products', ['name', 'quantity', 'revenue'], 'Top Products')}
                  disabled={downloading !== null || data.topProducts.length === 0}
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
                {data.topProducts.length > 0 ? (
                  data.topProducts.map((product, index) => (
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
                  onClick={() => downloadTableAsCSV(data.recentTransactions, 'recent-transactions', ['id', 'time', 'items', 'amount', 'payment'], 'Recent Transactions')}
                  disabled={downloading !== null || data.recentTransactions.length === 0}
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
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTransactions.length > 0 ? (
                    data.recentTransactions.map((transaction, index) => (
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

export default POSDashboard;