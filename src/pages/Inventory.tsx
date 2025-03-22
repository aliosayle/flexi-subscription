
import React, { useState } from 'react';
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
  TableRow 
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
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { InventoryItem, InventoryTransaction, TransactionType } from '@/types';
import { mockInventoryItems, mockInventoryTransactions } from '@/data/mock-data';

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>(mockInventoryItems);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(mockInventoryTransactions);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<TransactionType>('adjustment_in');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode.includes(searchTerm) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const sku = formData.get('sku') as string;
    const barcode = formData.get('barcode') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const price = parseFloat(formData.get('price') as string);
    const cost = parseFloat(formData.get('cost') as string);
    const category = formData.get('category') as string;
    
    if (selectedItem) {
      // Update existing item
      const updatedItems = items.map(item => 
        item.id === selectedItem.id 
          ? {
              ...item,
              name,
              description,
              sku,
              barcode,
              quantity,
              price,
              cost,
              category,
              updatedAt: new Date().toISOString()
            }
          : item
      );
      
      setItems(updatedItems);
      toast.success('Item updated successfully');
    } else {
      // Add new item
      const newItem: InventoryItem = {
        id: Date.now().toString(),
        name,
        description,
        sku,
        barcode,
        quantity,
        price,
        cost,
        category,
        imageSrc: 'https://placehold.co/100x100',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setItems([...items, newItem]);
      
      // Create a beginning transaction for the new item
      const newTransaction: InventoryTransaction = {
        id: Date.now().toString(),
        itemId: newItem.id,
        type: 'beginning',
        quantity,
        price: cost,
        totalAmount: cost * quantity,
        notes: 'Initial inventory',
        createdBy: '1', // Assuming admin user
        createdAt: new Date().toISOString()
      };
      
      setTransactions([...transactions, newTransaction]);
      toast.success('Item added successfully');
    }
    
    setIsAddItemDialogOpen(false);
  };

  const handleAdjustInventory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedItem) return;
    
    const formData = new FormData(event.currentTarget);
    const quantity = parseInt(formData.get('quantity') as string);
    const notes = formData.get('notes') as string;
    
    // Update the item quantity
    const updatedItems = items.map(item => {
      if (item.id === selectedItem.id) {
        const newQuantity = adjustmentType === 'adjustment_in' 
          ? item.quantity + quantity
          : item.quantity - quantity;
        
        return {
          ...item,
          quantity: newQuantity,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });
    
    setItems(updatedItems);
    
    // Create a transaction record
    const newTransaction: InventoryTransaction = {
      id: Date.now().toString(),
      itemId: selectedItem.id,
      type: adjustmentType,
      quantity,
      totalAmount: selectedItem.cost * quantity,
      notes,
      createdBy: '1', // Assuming admin user
      createdAt: new Date().toISOString()
    };
    
    setTransactions([...transactions, newTransaction]);
    toast.success('Inventory adjusted successfully');
    setIsAdjustDialogOpen(false);
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

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('Item deleted successfully');
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
                            <BarCode className="h-3 w-3 mr-1" />
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
                  {transactions.map((transaction) => {
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
