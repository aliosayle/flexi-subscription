import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Minus, History } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface CashDrawerTransaction {
  id: number;
  type: 'sale' | 'adjustment' | 'count';
  amount: number;
  notes: string;
  created_at: string;
  created_by_name: string;
}

export function CashDrawer() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CashDrawerTransaction[]>([]);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    try {
      const response = await api.get('/api/cash-drawer/balance');
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('Failed to fetch cash drawer balance');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/api/cash-drawer/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const handleAdjustment = async (type: 'adjustment' | 'count') => {
    if (!adjustmentAmount || isNaN(Number(adjustmentAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/cash-drawer/transactions', {
        type,
        amount: Number(adjustmentAmount),
        notes: adjustmentNotes
      });
      
      toast.success('Cash drawer adjusted successfully');
      setIsAdjustmentDialogOpen(false);
      setAdjustmentAmount('');
      setAdjustmentNotes('');
      fetchBalance();
      fetchTransactions();
    } catch (error) {
      console.error('Error adjusting cash drawer:', error);
      toast.error('Failed to adjust cash drawer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Cash Drawer</CardTitle>
            <CardDescription>Current balance and adjustments</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <History className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Transaction History</DialogTitle>
                  <DialogDescription>View all cash drawer transactions</DialogDescription>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Amount</th>
                        <th className="text-left py-2">Notes</th>
                        <th className="text-left py-2">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b">
                          <td className="py-2">
                            {new Date(transaction.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 capitalize">{transaction.type}</td>
                          <td className="py-2">${transaction.amount.toFixed(2)}</td>
                          <td className="py-2">{transaction.notes}</td>
                          <td className="py-2">{transaction.created_by_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adjust Cash Drawer</DialogTitle>
                  <DialogDescription>
                    Add or remove money from the cash drawer
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={adjustmentNotes}
                      onChange={(e) => setAdjustmentNotes(e.target.value)}
                      placeholder="Enter notes about this adjustment"
                    />
                  </div>
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    variant="destructive"
                    onClick={() => handleAdjustment('adjustment')}
                    disabled={loading}
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                  <Button
                    onClick={() => handleAdjustment('count')}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-center py-4">
          ${balance.toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground text-center">
          Expected cash drawer balance
        </div>
      </CardContent>
    </Card>
  );
} 