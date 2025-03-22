
import { 
  SubscriptionPackage, 
  InventoryItem,
  InventoryTransaction,
  Sale,
  User,
  Role,
  Permission
} from '@/types';

// Mock Subscription Packages
export const mockPackages: SubscriptionPackage[] = [
  {
    id: '1',
    name: 'Basic Monthly',
    description: 'Access to basic facilities and equipment',
    days: 30,
    price: 49.99,
    features: ['Gym access', 'Basic equipment', 'Locker use'],
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z'
  },
  {
    id: '2',
    name: 'Premium Monthly',
    description: 'Full access to all facilities and classes',
    days: 30,
    price: 89.99,
    features: ['24/7 Gym access', 'All equipment', 'Group classes', 'Personal trainer intro'],
    isPopular: true,
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z'
  },
  {
    id: '3',
    name: 'Quarterly Plan',
    description: 'Premium membership for three months',
    days: 90,
    price: 239.99,
    features: ['24/7 Gym access', 'All equipment', 'Group classes', 'Nutrition consultation'],
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z'
  },
  {
    id: '4',
    name: 'Annual Membership',
    description: 'Full year premium access with benefits',
    days: 365,
    price: 799.99,
    features: ['24/7 Gym access', 'All equipment', 'Unlimited classes', 'Quarterly assessments', 'Guest passes', 'Priority booking'],
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z'
  },
  {
    id: '5',
    name: 'Student Monthly',
    description: 'Special rate for students with valid ID',
    days: 30,
    price: 39.99,
    features: ['Gym access', 'Basic equipment', 'Locker use', 'Valid student ID required'],
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z'
  },
];

// Mock Inventory Items
export const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Protein Shake - Chocolate',
    description: 'Premium protein shake with 25g protein',
    sku: 'PRO-CHOC-001',
    barcode: '9501234567890',
    quantity: 45,
    price: 4.99,
    cost: 2.50,
    category: 'Supplements',
    imageSrc: 'https://placehold.co/100x100',
    createdAt: '2023-09-15T08:30:00Z',
    updatedAt: '2023-10-05T14:20:00Z'
  },
  {
    id: '2',
    name: 'Protein Shake - Vanilla',
    description: 'Premium protein shake with 25g protein',
    sku: 'PRO-VAN-002',
    barcode: '9501234567891',
    quantity: 38,
    price: 4.99,
    cost: 2.50,
    category: 'Supplements',
    imageSrc: 'https://placehold.co/100x100',
    createdAt: '2023-09-15T08:35:00Z',
    updatedAt: '2023-10-05T14:25:00Z'
  },
  {
    id: '3',
    name: 'Energy Bar - Peanut',
    description: 'High energy bar with protein and fiber',
    sku: 'BAR-PEA-001',
    barcode: '9501234567892',
    quantity: 56,
    price: 2.99,
    cost: 1.25,
    category: 'Snacks',
    imageSrc: 'https://placehold.co/100x100',
    createdAt: '2023-09-16T09:20:00Z',
    updatedAt: '2023-10-06T11:10:00Z'
  },
  {
    id: '4',
    name: 'Gym Towel - Small',
    description: 'Microfiber gym towel',
    sku: 'ACC-TWL-001',
    barcode: '9501234567893',
    quantity: 30,
    price: 9.99,
    cost: 4.50,
    category: 'Accessories',
    imageSrc: 'https://placehold.co/100x100',
    createdAt: '2023-09-18T10:15:00Z',
    updatedAt: '2023-10-07T15:45:00Z'
  },
  {
    id: '5',
    name: 'Water Bottle - 750ml',
    description: 'BPA free sports water bottle',
    sku: 'ACC-BTL-001',
    barcode: '9501234567894',
    quantity: 25,
    price: 12.99,
    cost: 6.00,
    category: 'Accessories',
    imageSrc: 'https://placehold.co/100x100',
    createdAt: '2023-09-20T11:30:00Z',
    updatedAt: '2023-10-08T13:20:00Z'
  },
  {
    id: '6',
    name: 'Pre-Workout - Berry Blast',
    description: 'Advanced pre-workout formula',
    sku: 'SUP-PRW-001',
    barcode: '9501234567895',
    quantity: 18,
    price: 29.99,
    cost: 15.00,
    category: 'Supplements',
    imageSrc: 'https://placehold.co/100x100',
    createdAt: '2023-09-22T14:45:00Z',
    updatedAt: '2023-10-10T09:30:00Z'
  },
];

// Mock Inventory Transactions
export const mockInventoryTransactions: InventoryTransaction[] = [
  {
    id: '1',
    itemId: '1',
    type: 'purchase',
    quantity: 50,
    price: 2.50,
    totalAmount: 125.00,
    notes: 'Initial purchase from supplier',
    createdBy: '1',
    createdAt: '2023-09-15T08:30:00Z'
  },
  {
    id: '2',
    itemId: '1',
    type: 'sale',
    quantity: 5,
    price: 4.99,
    totalAmount: 24.95,
    createdBy: '2',
    createdAt: '2023-09-20T15:45:00Z'
  },
  {
    id: '3',
    itemId: '2',
    type: 'purchase',
    quantity: 40,
    price: 2.50,
    totalAmount: 100.00,
    createdBy: '1',
    createdAt: '2023-09-15T08:35:00Z'
  },
  {
    id: '4',
    itemId: '2',
    type: 'sale',
    quantity: 2,
    price: 4.99,
    totalAmount: 9.98,
    createdBy: '3',
    createdAt: '2023-09-25T10:15:00Z'
  },
  {
    id: '5',
    itemId: '3',
    type: 'beginning',
    quantity: 60,
    price: 1.25,
    totalAmount: 75.00,
    notes: 'Initial inventory',
    createdBy: '1',
    createdAt: '2023-09-16T09:20:00Z'
  },
  {
    id: '6',
    itemId: '3',
    type: 'sale',
    quantity: 4,
    price: 2.99,
    totalAmount: 11.96,
    createdBy: '2',
    createdAt: '2023-09-28T16:30:00Z'
  },
  {
    id: '7',
    itemId: '4',
    type: 'adjustment_out',
    quantity: 2,
    totalAmount: 9.00,
    notes: 'Damaged items',
    createdBy: '1',
    createdAt: '2023-10-02T11:40:00Z'
  },
];

// Mock Sales
export const mockSales: Sale[] = [
  {
    id: '1',
    items: [
      {
        id: '1',
        itemId: '1',
        name: 'Protein Shake - Chocolate',
        price: 4.99,
        quantity: 2,
        totalPrice: 9.98
      },
      {
        id: '2',
        itemId: '3',
        name: 'Energy Bar - Peanut',
        price: 2.99,
        quantity: 1,
        totalPrice: 2.99
      }
    ],
    subtotal: 12.97,
    tax: 1.30,
    discount: 0,
    total: 14.27,
    paymentMethod: 'card',
    customer: {
      id: '101',
      name: 'John Smith',
      email: 'john@example.com'
    },
    createdBy: '2',
    createdAt: '2023-09-20T15:45:00Z'
  },
  {
    id: '2',
    items: [
      {
        id: '1',
        itemId: '2',
        name: 'Protein Shake - Vanilla',
        price: 4.99,
        quantity: 1,
        totalPrice: 4.99
      }
    ],
    subtotal: 4.99,
    tax: 0.50,
    discount: 0,
    total: 5.49,
    paymentMethod: 'cash',
    createdBy: '3',
    createdAt: '2023-09-25T10:15:00Z'
  },
  {
    id: '3',
    items: [
      {
        id: '1',
        itemId: '3',
        name: 'Energy Bar - Peanut',
        price: 2.99,
        quantity: 2,
        totalPrice: 5.98
      },
      {
        id: '2',
        itemId: '5',
        name: 'Water Bottle - 750ml',
        price: 12.99,
        quantity: 1,
        totalPrice: 12.99
      }
    ],
    subtotal: 18.97,
    tax: 1.90,
    discount: 2.00,
    total: 18.87,
    paymentMethod: 'card',
    customer: {
      id: '102',
      name: 'Sarah Jones',
      email: 'sarah@example.com'
    },
    createdBy: '2',
    createdAt: '2023-09-28T16:30:00Z'
  },
];

// Mock Permissions
export const mockPermissions: Permission[] = [
  { id: '1', name: 'view_packages', description: 'View subscription packages', module: 'packages' },
  { id: '2', name: 'create_packages', description: 'Create subscription packages', module: 'packages' },
  { id: '3', name: 'edit_packages', description: 'Edit subscription packages', module: 'packages' },
  { id: '4', name: 'delete_packages', description: 'Delete subscription packages', module: 'packages' },
  
  { id: '5', name: 'view_inventory', description: 'View inventory items', module: 'inventory' },
  { id: '6', name: 'create_inventory', description: 'Create inventory items', module: 'inventory' },
  { id: '7', name: 'edit_inventory', description: 'Edit inventory items', module: 'inventory' },
  { id: '8', name: 'delete_inventory', description: 'Delete inventory items', module: 'inventory' },
  { id: '9', name: 'adjust_inventory', description: 'Adjust inventory quantities', module: 'inventory' },
  
  { id: '10', name: 'access_pos', description: 'Access the POS system', module: 'pos' },
  { id: '11', name: 'create_sales', description: 'Create sales transactions', module: 'pos' },
  { id: '12', name: 'apply_discounts', description: 'Apply discounts to sales', module: 'pos' },
  { id: '13', name: 'void_sales', description: 'Void sales transactions', module: 'pos' },
  
  { id: '14', name: 'view_users', description: 'View system users', module: 'users' },
  { id: '15', name: 'create_users', description: 'Create system users', module: 'users' },
  { id: '16', name: 'edit_users', description: 'Edit system users', module: 'users' },
  { id: '17', name: 'delete_users', description: 'Delete system users', module: 'users' },
  { id: '18', name: 'manage_roles', description: 'Manage user roles', module: 'users' },
  
  { id: '19', name: 'access_settings', description: 'Access system settings', module: 'settings' },
  { id: '20', name: 'edit_settings', description: 'Edit system settings', module: 'settings' },
];

// Mock Roles
export const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full system access',
    permissions: mockPermissions,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Manager',
    description: 'Can manage most aspects of the system',
    permissions: mockPermissions.filter(p => !['delete_users', 'manage_roles', 'edit_settings'].includes(p.name)),
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Staff',
    description: 'Day-to-day operational access',
    permissions: mockPermissions.filter(p => 
      ['view_packages', 'view_inventory', 'access_pos', 'create_sales', 'apply_discounts'].includes(p.name)
    ),
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@flexigym.com',
    role: mockRoles[0], // Admin
    active: true,
    lastLogin: '2023-10-14T09:30:00Z',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Manager User',
    email: 'manager@flexigym.com',
    role: mockRoles[1], // Manager
    active: true,
    lastLogin: '2023-10-13T16:45:00Z',
    createdAt: '2023-01-05T00:00:00Z',
    updatedAt: '2023-01-05T00:00:00Z'
  },
  {
    id: '3',
    name: 'Staff User',
    email: 'staff@flexigym.com',
    role: mockRoles[2], // Staff
    active: true,
    lastLogin: '2023-10-14T08:15:00Z',
    createdAt: '2023-01-10T00:00:00Z',
    updatedAt: '2023-01-10T00:00:00Z'
  },
  {
    id: '4',
    name: 'Inactive User',
    email: 'inactive@flexigym.com',
    role: mockRoles[2], // Staff
    active: false,
    lastLogin: '2023-09-01T10:20:00Z',
    createdAt: '2023-02-15T00:00:00Z',
    updatedAt: '2023-09-02T00:00:00Z'
  },
];

// Chart Data for Dashboard
export const mockSalesChartData = [
  { month: 'Jan', sales: 4200 },
  { month: 'Feb', sales: 3800 },
  { month: 'Mar', sales: 5100 },
  { month: 'Apr', sales: 4800 },
  { month: 'May', sales: 5500 },
  { month: 'Jun', sales: 6200 },
  { month: 'Jul', sales: 6800 },
  { month: 'Aug', sales: 7100 },
  { month: 'Sep', sales: 6900 },
  { month: 'Oct', sales: 7500 },
  { month: 'Nov', sales: 8200 },
  { month: 'Dec', sales: 9000 },
];

export const mockMembershipStats = {
  total: 487,
  active: 423,
  expired: 64,
  newThisMonth: 32,
};

export const mockInventoryStats = {
  totalItems: mockInventoryItems.length,
  lowStock: mockInventoryItems.filter(item => item.quantity < 20).length,
  totalValue: mockInventoryItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0),
};

export const mockPopularProducts = [
  { id: '1', name: 'Protein Shake - Chocolate', sales: 145, revenue: 723.55 },
  { id: '3', name: 'Energy Bar - Peanut', sales: 98, revenue: 293.02 },
  { id: '6', name: 'Pre-Workout - Berry Blast', sales: 73, revenue: 2189.27 },
  { id: '5', name: 'Water Bottle - 750ml', sales: 67, revenue: 870.33 },
];

export const mockPopularPackages = [
  { id: '2', name: 'Premium Monthly', sales: 78 },
  { id: '1', name: 'Basic Monthly', sales: 53 },
  { id: '5', name: 'Student Monthly', sales: 41 },
  { id: '4', name: 'Annual Membership', sales: 25 },
];
