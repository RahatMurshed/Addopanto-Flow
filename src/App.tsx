import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider, useCompany } from "@/contexts/CompanyContext";
import { RoleProvider } from "@/contexts/RoleContext"; // Keep for legacy compatibility if needed
import { NavigationBlockerProvider } from "@/contexts/NavigationBlockerContext";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Khatas from "@/pages/Khatas";
import Revenue from "@/pages/Revenue";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import Students from "@/pages/Students";
import StudentDetail from "@/pages/StudentDetail";
import CompanySelection from "@/pages/CompanySelection";
import JoinCompany from "@/pages/JoinCompany";
import CreateCompany from "@/pages/CreateCompany";
import CompanyMembers from "@/pages/CompanyMembers";
import UserManagement from "@/pages/UserManagement";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <CompanyProvider>
      <RoleProvider>
        <CompanyGuard>{children}</CompanyGuard>
      </RoleProvider>
    </CompanyProvider>
  );
}

function CompanyGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, activeCompany, hasCompanies } = useCompany();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If on company selection pages, allow access
  if (window.location.pathname.startsWith("/companies")) {
    return <>{children}</>;
  }

  // If no companies, redirect to selection/join
  if (!hasCompanies) {
    return <Navigate to="/companies" replace />;
  }

  // If no active company selected, redirect to selection
  if (!activeCompany) {
    return <Navigate to="/companies" replace />;
  }

  // Normal app layout
  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/companies" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NavigationBlockerProvider>
            <Routes>
              <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
              
              {/* Company Selection Routes */}
              <Route path="/companies" element={<ProtectedRoute><CompanySelection /></ProtectedRoute>} />
              <Route path="/companies/join" element={<ProtectedRoute><JoinCompany /></ProtectedRoute>} />
              <Route path="/companies/create" element={<ProtectedRoute><CreateCompany /></ProtectedRoute>} />

              {/* Main App Routes */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/khatas" element={<ProtectedRoute><Khatas /></ProtectedRoute>} />
              <Route path="/revenue" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
              <Route path="/students/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/company/members" element={<ProtectedRoute><CompanyMembers /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NavigationBlockerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
