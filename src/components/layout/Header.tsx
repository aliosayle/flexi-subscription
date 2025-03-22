
import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PageTitle = {
  [key: string]: string;
};

const pageTitles: PageTitle = {
  '/': 'Dashboard',
  '/packages': 'Subscription Packages',
  '/pos': 'Point of Sale',
  '/inventory': 'Inventory Management',
  '/users': 'User Management',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'FlexiGym';

  return (
    <header className={cn(
      'h-16 px-4 border-b border-border flex items-center justify-between',
      'bg-background/90 backdrop-blur-sm sticky top-0 z-20'
    )}>
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="hidden md:block ml-8">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              className="w-[280px] pl-9 bg-muted/40 border-none focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <span className="h-6 border-l border-border"></span>
        <div className="text-sm hidden sm:block">
          <p className="font-medium">Admin User</p>
          <p className="text-xs text-muted-foreground">Super Admin</p>
        </div>
        <Button variant="ghost" size="sm" className="rounded-full p-0 w-8 h-8">
          <span className="text-xs font-medium">AD</span>
        </Button>
      </div>
    </header>
  );
}
