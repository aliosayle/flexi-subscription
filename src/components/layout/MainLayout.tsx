import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ShoppingCart, Users, UserCog, Building2 } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'POS', href: '/pos', icon: ShoppingCart },
  { name: 'Subscribers', href: '/subscribers', icon: Users },
  { name: 'Packages', href: '/packages', icon: Package },
  { name: 'Users', href: '/users', icon: UserCog },
  { name: 'Branches', href: '/branches', icon: Building2 },
];

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 ml-16 md:ml-64 flex flex-col relative">
        <Header />
        
        <main className={cn(
          "flex-1 overflow-y-auto p-4 md:p-6 transition-all", 
          "animate-fade-in"
        )}>
          {children}
        </main>
      </div>
      
      <Toaster position="top-right" expand={false} closeButton />
    </div>
  );
}
