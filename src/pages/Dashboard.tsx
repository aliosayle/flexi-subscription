import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { Users, Package, ShoppingCart, AlertTriangle, DollarSign, BarChart as RechartsBarChart, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, Activity } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CashDrawer } from '@/components/CashDrawer';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

interface DashboardStats {
  totalUsers: number;
  totalSales: number;
  totalInventory: number;
  totalRevenue: number;
  totalSubscribers: number;
  totalItems: number;
  todaySales: number;
  todayTransactions: number;
  monthlyRevenue: number;
}

interface RecentActivity {
  type: 'sale' | 'inventory' | 'subscription';
  created_at: string;
  amount: number;
  payment_method?: string;
  customer_name?: string;
  customer_email?: string;
  transaction_type?: string;
  item_name?: string;
  quantity?: number;
  description: string;
  time: string;
}

interface SalesByMonth {
  month: string;
  count: number;
  total_sales: number;
}

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
}

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<SalesByMonth[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activitiesRes, salesRes, lowStockRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/recent-activities'),
        api.get('/api/dashboard/sales-by-month'),
        api.get('/api/dashboard/low-stock')
      ]);

      setStats(statsRes.data);
      setRecentActivities(activitiesRes.data);
      setSalesByMonth(salesRes.data);
      setLowStockItems(lowStockRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (!hasPermission('view_reports')) {
    return <Navigate to="/subscribers" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your business performance
          </p>
        </div>
        <Link to="/sales-report">
          <Button>
            <Activity className="h-4 w-4 mr-2" />
            View Sales Report
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Items
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">
              In stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Sales
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.todaySales?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.todayTransactions || 0} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.monthlyRevenue?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total_sales" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center">
                  <div className={cn(
                    "rounded-full p-2",
                    activity.type === 'sale' ? 'bg-green-100 text-green-600' :
                    activity.type === 'subscription' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {activity.type === 'sale' ? <ShoppingCart className="h-4 w-4" /> :
                     activity.type === 'subscription' ? <Users className="h-4 w-4" /> :
                     <Package className="h-4 w-4" />}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Drawer Section */}
      <CashDrawer />
    </div>
  );
}
