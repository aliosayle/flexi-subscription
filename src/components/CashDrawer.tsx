import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Minus } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CashTransaction {
  id: number;
  type: 'sale' | 'adjustment' | 'count';
  amount: number;
  notes: string;
  created_at: string;
  created_by: string;
}

export function CashDrawer() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [isAddingMoney, setIsAddingMoney] = useState(false);
  const [isRemovingMoney, setIsRemovingMoney] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        api.get('/api/cash-drawer/balance'),
        api.get('/api/cash-drawer/transactions')
      ]);
      setBalance(balanceRes.data.balance);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Error fetching cash drawer data:', error);
      toast.error('Failed to load cash drawer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransaction = async (type: 'adjustment' | 'count') => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await api.post('/api/cash-drawer/transactions', {
        type,
        amount: Number(amount),
        notes
      });
      toast.success('Transaction recorded successfully');
      setAmount('');
      setNotes('');
      setIsAddingMoney(false);
      setIsRemovingMoney(false);
      fetchData();
    } catch (error) {
      console.error('Error recording transaction:', error);
      toast.error('Failed to record transaction');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Drawer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Drawer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Balance</span>
            <span className="text-2xl font-bold">${balance.toFixed(2)}</span>
          </div>

          <div className="flex gap-2">
            <Dialog open={isAddingMoney} onOpenChange={setIsAddingMoney}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Money
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Money to Drawer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter notes"
                    />
                  </div>
                  <Button onClick={() => handleTransaction('adjustment')} className="w-full">
                    Add Money
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isRemovingMoney} onOpenChange={setIsRemovingMoney}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Minus className="h-4 w-4 mr-2" />
                  Remove Money
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove Money from Drawer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter notes"
                    />
                  </div>
                  <Button onClick={() => handleTransaction('count')} className="w-full">
                    Remove Money
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Recent Transactions</h3>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {transaction.type === 'sale' ? 'Sale' : 
                       transaction.type === 'adjustment' ? 'Added Money' : 'Removed Money'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.notes || 'No notes'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      transaction.type === 'sale' || transaction.type === 'adjustment'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'sale' || transaction.type === 'adjustment' ? '+' : '-'}
                      ${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 