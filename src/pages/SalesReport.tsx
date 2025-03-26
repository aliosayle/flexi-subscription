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

      setSales(salesResponse.data);
      setSummary(summaryResponse.data);
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
    // Create CSV content
    const headers = ['Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment Method'];
    const rows = sales.map(sale => [
      format(new Date(sale.created_at), 'yyyy-MM-dd'),
      sale.customer_name || 'Walk-in',
      sale.items.map(item => `${item.name} (${item.quantity})`).join(', '),
      sale.subtotal,
      sale.tax,
      sale.discount,
      sale.total,
      sale.payment_method
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
  };

  // Prepare data for charts
  const dailySalesData = sales.reduce((acc: any[], sale) => {
    const date = format(new Date(sale.created_at), 'yyyy-MM-dd');
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.sales += 1;
      existing.revenue += sale.total;
    } else {
      acc.push({
        date,
        sales: 1,
        revenue: sale.total
      });
    }
    
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  const paymentMethodData = summary?.payment_methods ? 
    Object.entries(summary.payment_methods).map(([method, amount]) => ({
      method,
      amount
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
              <div className="text-2xl font-bold">{summary.total_sales}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.total_revenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.average_sale.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_items_sold}</div>
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
                      {sale.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                    </TableCell>
                    <TableCell className="text-right">${sale.subtotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${sale.tax.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${sale.discount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${sale.total.toFixed(2)}</TableCell>
                    <TableCell>{sale.payment_method}</TableCell>
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