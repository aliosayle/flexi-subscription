
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";

// Pages
import Dashboard from "@/pages/Dashboard";
import Packages from "@/pages/Packages";
import POS from "@/pages/POS";
import Inventory from "@/pages/Inventory";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          } />
          <Route path="/packages" element={
            <MainLayout>
              <Packages />
            </MainLayout>
          } />
          <Route path="/pos" element={
            <MainLayout>
              <POS />
            </MainLayout>
          } />
          <Route path="/inventory" element={
            <MainLayout>
              <Inventory />
            </MainLayout>
          } />
          <Route path="/users" element={
            <MainLayout>
              <Users />
            </MainLayout>
          } />
          <Route path="/settings" element={
            <MainLayout>
              <Settings />
            </MainLayout>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
