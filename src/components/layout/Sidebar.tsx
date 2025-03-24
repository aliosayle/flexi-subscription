import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Package, 
  ShoppingCart, 
  Boxes, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  BarChart,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';

type NavItem = {
  name: string;
  path: string;
  icon: React.ElementType;
  role?: string;
};

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: BarChart, role: 'admin' },
  { name: 'Packages', path: '/packages', icon: Package, role: 'admin' },
  { name: 'Subscribers', path: '/subscribers', icon: UserPlus },
  { name: 'POS', path: '/pos', icon: ShoppingCart },
  { name: 'Inventory', path: '/inventory', icon: Boxes, role: 'admin' },
  { name: 'Users', path: '/users', icon: Users, role: 'admin' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!item.role) return true; // Show items without role restriction
    return user?.role_name === item.role; // Show items only for matching role
  });

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar fixed left-0 top-0 z-30 flex flex-col border-r border-border',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between p-4 h-16 border-b border-border">
        {!collapsed && (
          <h1 className="text-xl font-semibold text-sidebar-foreground animate-fade-in">
            Kinshasa Mall Gym
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'rounded-full hover:bg-sidebar-accent',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.name}>
                <TooltipProvider delayDuration={0} disableHoverableContent>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        className={cn(
                          'flex items-center px-3 py-2 rounded-md group transition-all duration-200',
                          'hover:bg-sidebar-accent',
                          isActive 
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                            : 'text-sidebar-foreground'
                        )}
                      >
                        <item.icon className={cn(
                          'h-5 w-5 transition-transform',
                          isActive ? 'text-primary' : 'text-muted-foreground',
                          'group-hover:scale-110'
                        )} />
                        
                        {!collapsed && (
                          <span className={cn(
                            'ml-3 text-sm font-medium transition-opacity duration-200',
                            collapsed ? 'opacity-0' : 'opacity-100'
                          )}>
                            {item.name}
                          </span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    
                    {collapsed && (
                      <TooltipContent side="right" className="ml-2">
                        {item.name}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <span className="text-xs font-medium">{user?.role_name?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          {!collapsed && (
            <div className="ml-3 animate-fade-in">
              <p className="text-sm font-medium text-sidebar-foreground">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
