import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Minus, History, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CashTransaction {
  id: number;
  type: 'add' | 'remove' | 'sale' | 'reset';
  amount: number;
  notes: string;
  created_at: string;
}

export function CashDrawer() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCashDrawerData = async () => {
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
    fetchCashDrawerData();
  }, []);

  const handleTransaction = async (type: 'add' | 'remove' | 'reset') => {
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      await api.post('/api/cash-drawer/transactions', {
        type,
        amount: amountNum,
        notes
      });

      toast.success(`Successfully ${type}ed money from cash drawer`);
      setIsAddDialogOpen(false);
      setIsRemoveDialogOpen(false);
      setAmount('');
      setNotes('');
      fetchCashDrawerData();
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast.error('Failed to process transaction');
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
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cash Drawer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Balance */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Money
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Money to Cash Drawer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a note (optional)"
                      />
                    </div>
                    <Button onClick={() => handleTransaction('add')} className="w-full">
                      Add Money
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Minus className="h-4 w-4 mr-2" />
                    Remove Money
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Remove Money from Cash Drawer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a note (optional)"
                      />
                    </div>
                    <Button onClick={() => handleTransaction('remove')} className="w-full">
                      Remove Money
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Transaction History</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {transaction.type === 'add' && 'Added Money'}
                            {transaction.type === 'remove' && 'Removed Money'}
                            {transaction.type === 'sale' && 'Sale'}
                            {transaction.type === 'reset' && 'Reset Balance'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.notes || 'No notes'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.type === 'add' || transaction.type === 'sale'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {transaction.type === 'add' || transaction.type === 'sale' ? '+' : '-'}
                            ${transaction.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleTransaction('reset')}
            >
              Reset Balance
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 