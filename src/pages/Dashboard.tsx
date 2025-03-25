import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import { Users, Package, ShoppingCart, AlertTriangle, DollarSign, BarChart as RechartsBarChart } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CashDrawer } from '@/components/CashDrawer';

interface DashboardStats {
  totalUsers: number;
  totalSales: number;
  totalInventory: number;
  totalRevenue: number;
}

interface RecentActivity {
  type: 'sale' | 'inventory';
  created_at: string;
  amount: number;
  payment_method?: string;
  customer_name?: string;
  customer_email?: string;
  transaction_type?: string;
  item_name?: string;
  quantity?: number;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your business performance.</p>
        </div>
        <Button asChild>
          <Link to="/sales-report">
            <RechartsBarChart className="mr-2 h-4 w-4" />
            View Sales Report
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInventory || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenue.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
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

      {/* Recent Activities, Low Stock Items, and Cash Drawer */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Recent Activities</h2>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={`${activity.type}-${activity.created_at}`} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'sale' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {activity.type === 'sale' ? (
                          <ShoppingCart className="w-5 h-5" />
                        ) : (
                          <Package className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {activity.type === 'sale' ? (
                            `Sale to ${activity.customer_name || 'Customer'}`
                          ) : (
                            `${activity.transaction_type === 'purchase' ? 'Purchase' : 'Sale'} of ${activity.item_name}`
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${Number(activity.amount).toFixed(2)}
                      </p>
                      {activity.type === 'inventory' && (
                        <p className="text-sm text-gray-500">
                          {activity.quantity} units
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Qty: {item.quantity}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <CashDrawer />
      </div>
    </div>
  );
}
