
// Package Types
export interface SubscriptionPackage {
  id: string;
  name: string;
  description: string;
  days: number;
  price: number;
  features: string[];
  isPopular?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Inventory Types
export type TransactionType = 'purchase' | 'sale' | 'adjustment_in' | 'adjustment_out' | 'beginning';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  quantity: number;
  price: number;
  cost: number;
  category: string;
  imageSrc?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: TransactionType;
  quantity: number;
  price?: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

// Sale/POS Types
export interface CartItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'other';
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  createdBy: string;
  createdAt: string;
}

// User Management Types
export type UserRole = 'admin' | 'manager' | 'staff' | 'member';

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: 'packages' | 'inventory' | 'pos' | 'users' | 'settings';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  image?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}
