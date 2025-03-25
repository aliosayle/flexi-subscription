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
  XIcon
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

  // Fetch inventory items on component mount
  useEffect(() => {
    fetchItems();
    
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

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1; // 10% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setLoading(true);

      // Create sale
      const saleData = {
        items: cartItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total: calculateTotal(),
        payment_method: 'cash', // Always cash for POS
        customer_id: null // Optional: Add customer selection if needed
      };

      await api.post('/api/sales', saleData);

      // Clear cart and close dialog
      setCartItems([]);
      setIsCheckoutDialogOpen(false);
      toast.success('Sale completed successfully');
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Failed to process sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Product Search and Selection */}
        <div className="lg:col-span-2 space-y-4">
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
        
        {/* Right Column - Shopping Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
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
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
                <Separator />
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (10%):</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
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
