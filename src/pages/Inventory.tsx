import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TablePagination
} from '@/components/ui/table';
import { 
  ArrowUpDown, 
  Plus, 
  Search, 
  MoreVertical,
  Edit, 
  Trash,
  ArrowUp,
  ArrowDown,
  Barcode,
  Package,
  Calendar,
  Users,
  Truck,
  ClipboardList,
  X,
  FilePlus,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { InventoryItem, InventoryTransaction, TransactionType } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@/components/ui/resizable';
import api from '@/lib/axios';

// Type for transaction line items
interface TransactionLineItem {
  id: string;
  itemId: string;
  quantity: number;
  price: number;
  total: number;
}

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<TransactionType>('adjustment_in');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTransactionSheetOpen, setIsTransactionSheetOpen] = useState(false);
  const [transactionFormType, setTransactionFormType] = useState<TransactionType>('purchase');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // For multi-item transactions
  const [lineItems, setLineItems] = useState<TransactionLineItem[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerSupplier, setCustomerSupplier] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(transactionFormType === 'sale' ? 'cash' : 'paid');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  
  // For pagination
  const pageSize = 10;
  const totalTransactions = transactions.length;

  // Fetch inventory items from API
  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    }
  };

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      const response = await api.get('/api/inventory/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    fetchItems();
    fetchTransactions();
  }, []);
  
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode?.includes(searchTerm) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredLineItems = items.filter(item => 
    item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
    item.barcode?.includes(itemSearchTerm) ||
    item.sku.toLowerCase().includes(itemSearchTerm.toLowerCase())
  );

  const paginatedTransactions = transactions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  // Reset line items when transaction sheet is opened
  useEffect(() => {
    if (isTransactionSheetOpen) {
      setLineItems([]);
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setCustomerSupplier('');
      setPaymentStatus(transactionFormType === 'sale' ? 'cash' : 'paid');
      setTransactionNotes('');
      setAdjustmentReason('');
      setItemSearchTerm('');
    }
  }, [isTransactionSheetOpen, transactionFormType]);
  
  const handleAddItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    try {
      setIsLoading(true);
      const formData = new FormData(event.currentTarget);
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const sku = formData.get('sku') as string;
      const barcode = formData.get('barcode') as string;
      const quantity = parseInt(formData.get('quantity') as string);
      const price = parseFloat(formData.get('price') as string);
      const cost = parseFloat(formData.get('cost') as string);
      const category = formData.get('category') as string;
      
      const itemData = {
        name,
        description,
        sku,
        barcode,
        quantity,
        price,
        cost,
        category,
        imageSrc: 'https://placehold.co/100x100'
      };
      
      if (selectedItem) {
        // Update existing item
        await api.put(`/api/inventory/items/${selectedItem.id}`, itemData);
        toast.success('Item updated successfully');
      } else {
        // Add new item
        await api.post('/api/inventory/items', itemData);
        toast.success('Item added successfully');
      }
      
      // Refresh items list
      fetchItems();
      fetchTransactions();
      setIsAddItemDialogOpen(false);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error(selectedItem ? 'Failed to update item' : 'Failed to add item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustInventory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedItem) return;
    
    try {
      setIsLoading(true);
      const formData = new FormData(event.currentTarget);
      const quantity = parseInt(formData.get('quantity') as string);
      const notes = formData.get('notes') as string;
      
      const transactionData = {
        itemId: selectedItem.id,
        type: adjustmentType,
        quantity,
        notes
      };
      
      await api.post('/api/inventory/transactions', transactionData);
      
      toast.success('Inventory adjusted successfully');
      
      // Refresh data
      fetchItems();
      fetchTransactions();
      setIsAdjustDialogOpen(false);
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error('Failed to adjust inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLineItem = (item: InventoryItem) => {
    // Check if the item is already in the line items
    const existingItem = lineItems.find(lineItem => lineItem.itemId === item.id);
    
    if (existingItem) {
      // Update the quantity of the existing item
      handleUpdateLineItemQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      // Add a new line item
      const newLineItem: TransactionLineItem = {
        id: Date.now().toString(),
        itemId: item.id,
        quantity: 1,
        price: transactionFormType === 'sale' ? item.price : item.cost,
        total: transactionFormType === 'sale' ? item.price : item.cost
      };
      
      setLineItems([...lineItems, newLineItem]);
    }
    
    // Clear the search term
    setItemSearchTerm('');
  };
  
  const handleUpdateLineItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return;
    
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          total: item.price * quantity
        };
      }
      return item;
    }));
  };
  
  const handleUpdateLineItemPrice = (id: string, price: number) => {
    if (price < 0) return;
    
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          price,
          total: item.quantity * price
        };
      }
      return item;
    }));
  };
  
  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };
  
  const getTransactionTotal = () => {
    return lineItems.reduce((total, item) => total + item.total, 0);
  };
  
  const handleSaveTransaction = async () => {
    try {
      setIsLoading(true);
      
      if (lineItems.length === 0) {
        toast.error('Please add at least one item to the transaction');
        return;
      }
      
      // For bulk transactions (purchase/sale)
      if (transactionFormType === 'purchase' || transactionFormType === 'sale') {
        const bulkData = {
          type: transactionFormType,
          items: lineItems.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            price: item.price
          })),
          notes: transactionNotes,
          customerSupplier,
          paymentStatus
        };
        
        await api.post('/api/inventory/bulk-transactions', bulkData);
        
        toast.success(`${transactionFormType === 'purchase' ? 'Purchase' : 'Sale'} recorded successfully`);
      } else {
        // For single-item adjustments
        const transactionData = {
          itemId: lineItems[0].itemId,
          type: transactionFormType,
          quantity: lineItems[0].quantity,
          notes: transactionNotes || adjustmentReason
        };
        
        await api.post('/api/inventory/transactions', transactionData);
        
        toast.success('Inventory adjusted successfully');
      }
      
      // Refresh data
      fetchItems();
      fetchTransactions();
      setIsTransactionSheetOpen(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getTransactionTypeName = (type: TransactionType): string => {
    const types = {
      purchase: 'Purchase',
      sale: 'Sale',
      adjustment_in: 'Adjustment (In)',
      adjustment_out: 'Adjustment (Out)',
      beginning: 'Initial Stock'
    };
    return types[type] || type;
  };
  
  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAddItemDialogOpen(true);
  };
  
  const handleAdjustItem = (item: InventoryItem, type: TransactionType) => {
    setSelectedItem(item);
    setAdjustmentType(type);
    setIsAdjustDialogOpen(true);
  };
  
  const handleDeleteItem = async (id: string) => {
    try {
      await api.delete(`/api/inventory/items/${id}`);
      toast.success('Item deleted successfully');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };
  
  const openTransactionForm = (type: TransactionType) => {
    setTransactionFormType(type);
    setIsTransactionSheetOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">Manage your products and stock levels.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search items..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => {
            setSelectedItem(null);
            setIsAddItemDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" onClick={() => openTransactionForm('sale')}>
          <ArrowUp className="mr-2 h-4 w-4" />
          New Sale
        </Button>
        <Button variant="outline" onClick={() => openTransactionForm('purchase')}>
          <Truck className="mr-2 h-4 w-4" />
          New Purchase
        </Button>
        <Button variant="outline" onClick={() => openTransactionForm('adjustment_in')}>
          <ArrowDown className="mr-2 h-4 w-4" />
          Adjust In
        </Button>
        <Button variant="outline" onClick={() => openTransactionForm('adjustment_out')}>
          <ArrowUp className="mr-2 h-4 w-4" />
          Adjust Out
        </Button>
        <Button variant="outline" onClick={() => openTransactionForm('beginning')}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Beginning Qty
        </Button>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items">Inventory Items</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>All products and stock levels in your inventory.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>
                      <div className="flex items-center space-x-1">
                        <span>Name</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>SKU / Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="w-10 h-10 rounded-md overflow-hidden border">
                          <img src={item.imageSrc || 'https://placehold.co/100x100'} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-xs">
                            <span className="font-semibold mr-1">SKU:</span> {item.sku}
                          </div>
                          <div className="flex items-center text-xs">
                            <Barcode className="h-3 w-3 mr-1" />
                            {item.barcode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono ${item.quantity < 10 ? 'text-red-500' : ''}`}>
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditItem(item)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdjustItem(item, 'adjustment_in')}>
                              <ArrowUp className="h-4 w-4 mr-2" />
                              Add Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdjustItem(item, 'adjustment_out')}>
                              <ArrowDown className="h-4 w-4 mr-2" />
                              Remove Stock
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-500"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Transactions</CardTitle>
              <CardDescription>History of all inventory movements and adjustments.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => {
                    const item = items.find(i => i.id === transaction.itemId);
                    
                    if (!item) return null;
                    
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </TableCell>
                        <TableCell>
                          <TransactionTypeBadge type={transaction.type} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {transaction.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${transaction.totalAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transaction.notes || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4">
                <TablePagination
                  totalItems={totalTransactions}
                  pageSize={pageSize}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleAddItem}>
            <DialogHeader>
              <DialogTitle>
                {selectedItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </DialogTitle>
              <DialogDescription>
                Fill in the item details below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={selectedItem?.name || ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={selectedItem?.category || ''}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={selectedItem?.description || ''}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    defaultValue={selectedItem?.sku || ''}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    defaultValue={selectedItem?.barcode || ''}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    defaultValue={selectedItem?.quantity || 0}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItem?.cost || 0}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItem?.price || 0}
                    required
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddItemDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedItem ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Inventory Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleAdjustInventory}>
            <DialogHeader>
              <DialogTitle>
                {adjustmentType === 'adjustment_in' ? 'Add Stock' : 'Remove Stock'}
              </DialogTitle>
              <DialogDescription>
                {selectedItem && (
                  <div className="mt-2">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2" />
                      <span className="font-medium">{selectedItem.name}</span>
                    </div>
                    <div className="text-xs mt-1">
                      Current stock: <span className="font-mono">{selectedItem.quantity}</span> units
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adjustType">Adjustment Type</Label>
                <Select
                  value={adjustmentType}
                  onValueChange={(value) => setAdjustmentType(value as TransactionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment_in">Add Stock</SelectItem>
                    <SelectItem value="adjustment_out">Remove Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Reason for adjustment"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAdjustDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* ERP-Style Transaction Sheet with Table Interface */}
      <Sheet open={isTransactionSheetOpen} onOpenChange={setIsTransactionSheetOpen}>
        <SheetContent className="w-full sm:max-w-[900px] p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle className="text-xl">{getTransactionTypeName(transactionFormType)}</SheetTitle>
              <SheetDescription>
                {transactionFormType === 'sale' && 'Record a sale transaction'}
                {transactionFormType === 'purchase' && 'Record a purchase from supplier'}
                {transactionFormType === 'adjustment_in' && 'Manually increase inventory'}
                {transactionFormType === 'adjustment_out' && 'Manually decrease inventory'}
                {transactionFormType === 'beginning' && 'Set opening stock level'}
              </SheetDescription>
            </SheetHeader>
            
            <div className="p-4 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    required
                  />
                </div>
                
                {(transactionFormType === 'sale' || transactionFormType === 'purchase') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="customerSupplier">
                        {transactionFormType === 'sale' ? 'Customer' : 'Supplier'}
                      </Label>
                      <Input
                        id="customerSupplier"
                        value={customerSupplier}
                        onChange={(e) => setCustomerSupplier(e.target.value)}
                        placeholder={transactionFormType === 'sale' ? 'Customer name' : 'Supplier name'}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">
                        {transactionFormType === 'sale' ? 'Payment Method' : 'Payment Status'}
                      </Label>
                      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {transactionFormType === 'sale' ? (
                            <>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="partial">Partial</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {(transactionFormType === 'adjustment_in' || transactionFormType === 'adjustment_out') && (
                  <div className="space-y-2">
                    <Label htmlFor="adjustmentReason">Reason</Label>
                    <Select value={adjustmentReason} onValueChange={setAdjustmentReason} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {transactionFormType === 'adjustment_in' ? (
                          <>
                            <SelectItem value="found">Found Items</SelectItem>
                            <SelectItem value="returned">Customer Return</SelectItem>
                            <SelectItem value="correction">Inventory Count Correction</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="damaged">Damaged/Expired</SelectItem>
                            <SelectItem value="lost">Lost/Stolen</SelectItem>
                            <SelectItem value="correction">Inventory Count Correction</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="notes">Remarks</Label>
                  <Input
                    id="notes"
                    value={transactionNotes}
                    onChange={(e) => setTransactionNotes(e.target.value)}
                    placeholder="Additional details about this transaction"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex-grow flex flex-col p-4 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Line Items</h3>
                {/* Search box for products */}
                <div className="relative max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search products..."
                    className="pl-9 w-[300px]"
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                  />
                  {itemSearchTerm && (
                    <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredLineItems.length > 0 ? (
                        filteredLineItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2 hover:bg-muted cursor-pointer flex items-center"
                            onClick={() => {
                              handleAddLineItem(item);
                              setItemSearchTerm('');
                            }}
                          >
                            <div className="w-6 h-6 mr-2 border rounded overflow-hidden">
                              <img src={item.imageSrc || 'https://placehold.co/100x100'} className="w-full h-full object-cover" alt={item.name} />
                            </div>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                SKU: {item.sku} | Stock: {item.quantity} | ${item.price.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-center text-muted-foreground">No products found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border rounded-md flex-grow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[150px] text-right">Quantity</TableHead>
                      <TableHead className="w-[150px] text-right">Price</TableHead>
                      <TableHead className="w-[150px] text-right">Total</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((lineItem) => {
                      const item = items.find(i => i.id === lineItem.itemId);
                      if (!item) return null;
                      
                      return (
                        <TableRow key={lineItem.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded border overflow-hidden mr-2">
                                <img 
                                  src={item.imageSrc || 'https://placehold.co/100x100'} 
                                  alt={item.name}
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              value={lineItem.quantity}
                              onChange={(e) => handleUpdateLineItemQuantity(lineItem.id, parseInt(e.target.value) || 0)}
                              className="w-20 ml-auto text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={lineItem.price}
                              onChange={(e) => handleUpdateLineItemPrice(lineItem.id, parseFloat(e.target.value) || 0)}
                              className="w-24 ml-auto text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">${lineItem.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLineItem(lineItem.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Empty row with "Add Product" button */}
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-muted-foreground"
                          onClick={() => setItemSearchTerm(' ')} // Set to space to trigger the dropdown
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Product
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-between items-center mt-4 border-t pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsTransactionSheetOpen(false)}
                >
                  Cancel
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="text-xl font-bold">${getTransactionTotal().toFixed(2)}</div>
                  </div>
                  <Button 
                    onClick={handleSaveTransaction}
                    disabled={lineItems.length === 0}
                  >
                    {transactionFormType === 'sale' ? 
                      <FileText className="mr-2 h-4 w-4" /> : 
                      <FilePlus className="mr-2 h-4 w-4" />
                    }
                    Save Transaction
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

interface TransactionTypeBadgeProps {
  type: TransactionType;
}

const TransactionTypeBadge = ({ type }: TransactionTypeBadgeProps) => {
  let label = '';
  let className = '';
  
  switch (type) {
    case 'purchase':
      label = 'Purchase';
      className = 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      break;
    case 'sale':
      label = 'Sale';
      className = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      break;
    case 'adjustment_in':
      label = 'Added';
      className = 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      break;
    case 'adjustment_out':
      label = 'Removed';
      className = 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      break;
    case 'beginning':
      label = 'Initial';
      className = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      break;
  }
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
};

export default Inventory;
