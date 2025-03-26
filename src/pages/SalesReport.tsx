import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/axios';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface Sale {
  id: string;
  created_at: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  customer_name: string;
  customer_email: string;
  items: SaleItem[];
}

interface SaleItem {
  id: string;
  item_id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface SalesSummary {
  total_sales: number;
  total_revenue: number;
  average_sale: number;
  total_items_sold: number;
  payment_methods: {
    [key: string]: number;
  };
}

export default function SalesReport() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const start = startDate ? format(startDate, 'yyyy-MM-dd') : '';
      const end = endDate ? format(endDate, 'yyyy-MM-dd') : '';
      
      const [salesResponse, summaryResponse] = await Promise.all([
        api.get(`/api/sales/by-date?startDate=${start}&endDate=${end}`),
        api.get(`/api/sales/summary?startDate=${start}&endDate=${end}`)
      ]);

      // Normalize the sales data to ensure numeric fields are numbers
      const salesData = (salesResponse.data || []).map(sale => ({
        ...sale,
        subtotal: typeof sale.subtotal === 'number' ? sale.subtotal : parseFloat(sale.subtotal) || 0,
        tax: typeof sale.tax === 'number' ? sale.tax : parseFloat(sale.tax) || 0, 
        discount: typeof sale.discount === 'number' ? sale.discount : parseFloat(sale.discount) || 0,
        total: typeof sale.total === 'number' ? sale.total : parseFloat(sale.total) || 0,
        items: Array.isArray(sale.items) ? sale.items.map(item => ({
          ...item,
          quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0,
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          total: typeof item.total === 'number' ? item.total : parseFloat(item.total) || 0
        })) : []
      }));
      
      // Transform and normalize summary data
      let summaryData = summaryResponse.data || [];
      if (Array.isArray(summaryData)) {
        // Calculate aggregated summary from the array of data
        const totalSales = summaryData.length;
        const totalRevenue = summaryData.reduce((sum, item) => {
          const itemTotal = typeof item.total === 'number' ? item.total : parseFloat(item.total) || 0;
          return sum + itemTotal;
        }, 0);
        
        const totalItems = salesData.reduce((sum, sale) => {
          return sum + (Array.isArray(sale.items) ? sale.items.reduce((itemSum, item) => {
            const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
            return itemSum + quantity;
          }, 0) : 0);
        }, 0);
        
        // Aggregate payment methods
        const paymentMethods = {};
        summaryData.forEach(item => {
          const method = item.payment_method || 'Unknown';
          const itemTotal = typeof item.total === 'number' ? item.total : parseFloat(item.total) || 0;
          paymentMethods[method] = (paymentMethods[method] || 0) + itemTotal;
        });
        
        // Create a standardized summary object
        summaryData = {
          total_sales: totalSales,
          total_revenue: totalRevenue,
          average_sale: totalSales > 0 ? totalRevenue / totalSales : 0,
          total_items_sold: totalItems,
          payment_methods: paymentMethods
        };
      }

      setSales(salesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Failed to fetch sales data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate]);

  const handleExport = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment Method'];
      const rows = sales.map(sale => [
        format(new Date(sale.created_at || new Date()), 'yyyy-MM-dd'),
        sale.customer_name || 'Walk-in',
        Array.isArray(sale.items) 
          ? sale.items.map(item => `${item.name || 'Unknown'} (${item.quantity || 0})`).join(', ')
          : 'No items',
        typeof sale.subtotal === 'number' ? sale.subtotal.toFixed(2) : '0.00',
        typeof sale.tax === 'number' ? sale.tax.toFixed(2) : '0.00',
        typeof sale.discount === 'number' ? sale.discount.toFixed(2) : '0.00',
        typeof sale.total === 'number' ? sale.total.toFixed(2) : '0.00',
        sale.payment_method || 'Unknown'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Prepare data for charts
  const dailySalesData = sales.reduce((acc: any[], sale) => {
    try {
      const date = format(new Date(sale.created_at || new Date()), 'yyyy-MM-dd');
      const existing = acc.find(item => item.date === date);
      const saleTotal = typeof sale.total === 'number' ? sale.total : parseFloat(sale.total) || 0;
      
      if (existing) {
        existing.sales += 1;
        existing.revenue += saleTotal;
      } else {
        acc.push({
          date,
          sales: 1,
          revenue: saleTotal
        });
      }
    } catch (error) {
      console.error('Error processing sale for chart:', error);
    }
    
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  const paymentMethodData = summary?.payment_methods ? 
    Object.entries(summary.payment_methods).map(([method, amount]) => ({
      method,
      amount: typeof amount === 'number' ? amount : 0
    })) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Report</h2>
          <p className="text-muted-foreground">View and analyze your sales data.</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_sales || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(summary.total_revenue || 0).toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(summary.average_sale || 0).toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_items_sold || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{format(new Date(sale.created_at), 'PPP')}</TableCell>
                    <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                    <TableCell>
                      {Array.isArray(sale.items) ? 
                        sale.items.map(item => `${item.name || 'Unknown'} (${item.quantity || 0})`).join(', ') : 
                        'No items'
                      }
                    </TableCell>
                    <TableCell className="text-right">${typeof sale.subtotal === 'number' ? sale.subtotal.toFixed(2) : '0.00'}</TableCell>
                    <TableCell className="text-right">${typeof sale.tax === 'number' ? sale.tax.toFixed(2) : '0.00'}</TableCell>
                    <TableCell className="text-right">${typeof sale.discount === 'number' ? sale.discount.toFixed(2) : '0.00'}</TableCell>
                    <TableCell className="text-right">${typeof sale.total === 'number' ? sale.total.toFixed(2) : '0.00'}</TableCell>
                    <TableCell>{sale.payment_method || 'Unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 