
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, Package, ShoppingCart, Users, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockSalesChartData, mockMembershipStats, mockInventoryStats, mockPopularProducts, mockPopularPackages } from '@/data/mock-data';

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Members" 
          value={mockMembershipStats.active} 
          change={+7.2} 
          icon={<Users className="w-6 h-6" />} 
        />
        <StatCard 
          title="Monthly Revenue" 
          value="$24,850" 
          change={+12.5} 
          icon={<DollarSign className="w-6 h-6" />} 
        />
        <StatCard 
          title="New Sign-ups" 
          value={mockMembershipStats.newThisMonth} 
          change={-3.1} 
          icon={<TrendingUp className="w-6 h-6" />} 
        />
        <StatCard 
          title="Inventory Value" 
          value={`$${mockInventoryStats.totalValue.toFixed(2)}`} 
          change={+4.3} 
          icon={<ShoppingCart className="w-6 h-6" />} 
        />
      </div>
      
      {/* Sales Chart */}
      <Card className="shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Monthly revenue for the current year</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockSalesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value) => [`$${value}`, 'Revenue']}
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  border: 'none'
                }}
              />
              <Bar 
                dataKey="sales" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Products */}
        <Card className="shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Popular Products</CardTitle>
            <CardDescription>Top selling items this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockPopularProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sales} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${product.revenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Popular Packages */}
        <Card className="shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Popular Packages</CardTitle>
            <CardDescription>Most purchased subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockPopularPackages.map((pkg, index) => (
                <div key={pkg.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">{pkg.sales} subscriptions</p>
                    </div>
                  </div>
                  <div>
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
}

const StatCard = ({ title, value, change, icon }: StatCardProps) => {
  const isPositive = change >= 0;
  
  return (
    <Card className="shadow-sm group hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold group-hover:scale-105 transition-transform">{value}</p>
          </div>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-primary/10 text-primary",
            "group-hover:scale-110 transition-transform"
          )}>
            {icon}
          </div>
        </div>
        
        <div className="flex items-center mt-4">
          <div className={cn(
            "text-sm font-medium flex items-center",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            <ArrowUpRight className={cn(
              "h-4 w-4 mr-1",
              !isPositive && "rotate-180"
            )} />
            {Math.abs(change)}%
          </div>
          <span className="text-sm text-muted-foreground ml-1">vs last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
