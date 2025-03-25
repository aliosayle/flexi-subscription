import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  XCircle, 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Barcode, 
  Banknote, 
  Check, 
  XIcon,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { InventoryItem, CartItem, Sale } from '@/types';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';

const POS = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isDrawerDialogOpen, setIsDrawerDialogOpen] = useState(false);
  const [drawerBalance, setDrawerBalance] = useState(0);
  const [drawerAdjustment, setDrawerAdjustment] = useState('');
  const [drawerNote, setDrawerNote] = useState('');
  const paymentMethod = 'cash';
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  
  // Get current user from auth context
  const { user } = useAuth();
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  const filteredItems = searchTerm 
    ? items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.includes(searchTerm)) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/inventory/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrawerBalance = async () => {
    try {
      const response = await api.get('/api/pos/drawer-balance');
      setDrawerBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching drawer balance:', error);
      toast.error('Failed to fetch drawer balance');
    }
  };

  // Fetch inventory items and drawer balance on component mount
  useEffect(() => {
    fetchItems();
    fetchDrawerBalance();
    
    // Focus on the barcode input when the component mounts
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const handleBarcodeSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!barcodeInputRef.current) return;
    
    const barcode = barcodeInputRef.current.value;
    const item = items.find(item => item.barcode === barcode);
    
    if (item) {
      handleAddToCart(item);
      barcodeInputRef.current.value = '';
    } else {
      toast.error('Product not found');
    }
    
    // Re-focus on the input
    barcodeInputRef.current.focus();
  };

  const handleAddToCart = (item: InventoryItem) => {
    // Check if the item has enough quantity in stock
    if (item.quantity <= 0) {
      toast.error(`${item.name} is out of stock`);
      return;
    }
    
    const existingCartItem = cartItems.find(cartItem => cartItem.itemId === item.id);
    
    if (existingCartItem) {
      // Check if adding more would exceed available quantity
      if (existingCartItem.quantity + 1 > item.quantity) {
        toast.error(`Not enough ${item.name} in stock`);
        return;
      }
      
      // Update quantity if the item is already in the cart
      setCartItems(cartItems.map(cartItem => 
        cartItem.itemId === item.id 
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
              totalPrice: (cartItem.quantity + 1) * cartItem.price
            }
          : cartItem
      ));
    } else {
      // Add new item to the cart
      const newCartItem: CartItem = {
        id: Date.now().toString(),
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        totalPrice: item.price
      };
      
      setCartItems([...cartItems, newCartItem]);
    }
    
    toast.success(`Added ${item.name} to cart`);
  };

  const handleUpdateQuantity = (id: string, change: number) => {
    setCartItems(cartItems.map(cartItem => {
      if (cartItem.id === id) {
        // Find the inventory item to check stock
        const inventoryItem = items.find(item => item.id === cartItem.itemId);
        const newQuantity = Math.max(1, cartItem.quantity + change);
        
        // Check if updating would exceed available quantity
        if (change > 0 && inventoryItem && newQuantity > inventoryItem.quantity) {
          toast.error(`Not enough ${cartItem.name} in stock`);
          return cartItem;
        }
        
        return {
          ...cartItem,
          quantity: newQuantity,
          totalPrice: newQuantity * cartItem.price
        };
      }
      return cartItem;
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    try {
      await api.post('/api/sales', {
        items: cartItems.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice
        })),
        total: calculateTotal(),
        paymentMethod: paymentMethod,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name,
        customer_email: selectedCustomer?.email
      });
      toast.success('Sale completed successfully');
      setCartItems([]);
      setSelectedCustomer(null);
      setIsCheckoutDialogOpen(false);
      fetchItems();
      fetchDrawerBalance(); // Update drawer balance after sale
    } catch (error) {
      console.error('Error completing sale:', error);
      toast.error('Failed to complete sale');
    }
  };

  const handleDrawerAdjustment = async () => {
    try {
      const adjustment = parseFloat(drawerAdjustment);
      if (isNaN(adjustment)) {
        toast.error('Please enter a valid amount');
        return;
      }

      await api.post('/api/pos/drawer-adjustment', {
        amount: adjustment,
        note: drawerNote
      });

      toast.success('Drawer balance updated successfully');
      setIsDrawerDialogOpen(false);
      setDrawerAdjustment('');
      setDrawerNote('');
      fetchDrawerBalance();
    } catch (error) {
      console.error('Error updating drawer balance:', error);
      toast.error('Failed to update drawer balance');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Product Search and Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Point of Sale</CardTitle>
              <CardDescription>
                Scan barcode or search for products to add to cart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barcode Scanner */}
              <form onSubmit={handleBarcodeSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Scan barcode..."
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="default">
                  Add
                </Button>
              </form>
              
              {/* Product Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-10">
                <p>Loading inventory items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="col-span-full text-center py-10">
                <p>No products found</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <Card 
                  key={item.id} 
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-all duration-200",
                    "hover:translate-y-[-2px]",
                    item.quantity <= 0 && "opacity-50"
                  )}
                  onClick={() => handleAddToCart(item)}
                >
                  <CardContent className="p-3 text-center">
                    <div className="aspect-square mb-2 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                      <img 
                        src={item.imageSrc || 'https://placehold.co/100x100'} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{item.sku}</p>
                      <p className="font-bold">${item.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Stock: {item.quantity}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        
        {/* Right Column - Shopping Cart and Drawer Balance */}
        <div className="space-y-4">
          {/* Drawer Balance Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Wallet className="mr-2 h-5 w-5" />
                  Cash Drawer
                </CardTitle>
                <Dialog open={isDrawerDialogOpen} onOpenChange={setIsDrawerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Adjust Balance
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adjust Drawer Balance</DialogTitle>
                      <DialogDescription>
                        Enter the amount to add or remove from the drawer.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="adjustment">Amount</Label>
                        <Input
                          id="adjustment"
                          type="number"
                          step="0.01"
                          placeholder="Enter amount"
                          value={drawerAdjustment}
                          onChange={(e) => setDrawerAdjustment(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="note">Note</Label>
                        <Input
                          id="note"
                          placeholder="Enter reason for adjustment"
                          value={drawerNote}
                          onChange={(e) => setDrawerNote(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDrawerDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleDrawerAdjustment}>
                        Update Balance
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-center">
                ${drawerBalance.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Expected cash in drawer
              </p>
            </CardContent>
          </Card>

          {/* Shopping Cart Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Cart
                </CardTitle>
                <span className="text-muted-foreground text-sm">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>Your cart is empty</p>
                  <p className="text-xs mt-1">Scan or search for products to add them to your cart.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-3">
                      <div className="space-y-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-none"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-none"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveFromCart(item.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col">
              <div className="w-full space-y-2 mb-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                size="lg"
                disabled={cartItems.length === 0 || loading}
                onClick={() => setIsCheckoutDialogOpen(true)}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Checkout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Checkout Dialog */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
            <DialogDescription>
              Finalize the transaction for cash payment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Cash payment info */}
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
              <Banknote className="h-8 w-8 mr-3" />
              <span className="text-lg font-medium">Cash Payment Only</span>
            </div>
            
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-medium mb-2">Order Summary</h3>
              <div className="space-y-1">
                <div className="flex justify-between font-bold mt-2">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setIsCheckoutDialogOpen(false)}
              disabled={loading}
            >
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;
