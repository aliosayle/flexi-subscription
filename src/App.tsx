import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";

// Pages
import Dashboard from "@/pages/Dashboard";
import Packages from "@/pages/Packages";
import POS from "@/pages/POS";
import Inventory from "@/pages/Inventory";
import Users from "@/pages/Users";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Subscribers from "@/pages/Subscribers";
import SalesReport from "@/pages/SalesReport";
import Companies from './pages/Companies';
import Branches from './pages/Branches';

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// App with Router and Auth Provider
const AppWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/packages" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Packages />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/subscribers" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Subscribers />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <POS />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Inventory />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Users />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sales-report" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <SalesReport />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route path="/companies" element={
          <ProtectedRoute>
            <MainLayout>
              <Companies />
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/branches" element={
          <ProtectedRoute>
            <MainLayout>
              <Branches />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* Catch all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppWithProviders />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
