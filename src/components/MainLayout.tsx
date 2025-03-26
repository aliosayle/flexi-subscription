import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  BarChart, 
  Settings, 
  LogOut,
  Building2
} from 'lucide-react';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      show: true
    },
    {
      name: 'Subscribers',
      href: '/subscribers',
      icon: Users,
      show: true
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: Package,
      show: true
    },
    {
      name: 'POS',
      href: '/pos',
      icon: ShoppingCart,
      show: true
    },
    {
      name: 'Sales Report',
      href: '/sales-report',
      icon: BarChart,
      show: user?.permissions?.includes('view_reports')
    },
    {
      name: 'Companies',
      href: '/companies',
      icon: Building2,
      show: user?.role_name === 'admin'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      show: user?.role_name === 'admin'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-card border-r">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-primary">FlexiGym</h1>
          </div>
          <nav className="space-y-1 px-3">
            {navigation.map((item) => (
              item.show && (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 ${
                    location.pathname === item.href ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50' : ''
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            ))}
          </nav>
          <div className="absolute bottom-0 w-64 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout; 