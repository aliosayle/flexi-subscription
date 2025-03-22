
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

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
