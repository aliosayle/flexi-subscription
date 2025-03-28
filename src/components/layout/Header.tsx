import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type PageTitle = {
  [key: string]: string;
};

const pageTitles: PageTitle = {
  '/': 'Dashboard',
  '/packages': 'Subscription Packages',
  '/pos': 'Point of Sale',
  '/inventory': 'Inventory Management',
  '/users': 'User Management',
};

export function Header() {
  const location = useLocation();
  const { user, selectedBranch, logout } = useAuth();
  
  // Get page title or use dynamic company/branch title
  const pageTitle = pageTitles[location.pathname];
  const companyName = selectedBranch?.company_name || 'FlexiGym';
  const branchName = selectedBranch?.name || '';
  const title = pageTitle || `${companyName}${branchName ? ` - ${branchName}` : ''}`;
  
  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className={cn(
      'h-16 px-4 border-b border-border flex items-center justify-between',
      'bg-background/90 backdrop-blur-sm sticky top-0 z-20'
    )}>
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <span className="h-6 border-l border-border"></span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center cursor-pointer">
              <div className="text-sm hidden sm:block mr-2">
                <p className="font-medium">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-muted-foreground">{user?.role_name || 'Super Admin'}</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full p-0 w-8 h-8">
                <span className="text-xs font-medium">{getInitials()}</span>
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
