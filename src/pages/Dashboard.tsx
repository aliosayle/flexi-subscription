import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Package, ShoppingCart, AlertTriangle, DollarSign, Activity, Building2 } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalSubscribers: number;
  totalSales: number;
  totalInventory: number;
  totalRevenue: number;
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
  id?: number;
  description: string;
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
  const { token, selectedBranch } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<SalesByMonth[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
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
  }, [selectedBranch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        {selectedBranch && (
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <Building2 className="h-4 w-4" />
            <p>Branch: <span className="font-medium">{selectedBranch.name}</span></p>
            <Badge variant="outline" className="ml-2">{selectedBranch.company_name}</Badge>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/subscribers">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSubscribers || 0}</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/sales-report">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/inventory">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalInventory || 0}</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/sales-report">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.totalRevenue.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>
        </Link>
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

      {/* Recent Activities and Low Stock Items */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Recent Activities</h2>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div
                    key={`activity-${activity.type}-${activity.id || activity.created_at}-${index}`}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        {activity.type === 'sale' ? (
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        ) : activity.type === 'subscription' ? (
                          <Users className="h-4 w-4 text-primary" />
                        ) : activity.type === 'inventory' ? (
                          <Package className="h-4 w-4 text-primary" />
                        ) : (
                          <Activity className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {activity.amount && typeof activity.amount === 'number' && activity.amount > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium">${activity.amount.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Link to="/inventory">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
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
        </Link>
      </div>
    </div>
  );
}
