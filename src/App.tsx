import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { NavigationBlockerProvider } from "@/contexts/NavigationBlockerContext";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Khatas from "@/pages/Khatas";
import Revenue from "@/pages/Revenue";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import UserManagement from "@/pages/UserManagement";
import ModeratorControl from "@/pages/ModeratorControl";
import RegistrationRequests from "@/pages/RegistrationRequests";
import PendingApproval from "@/pages/PendingApproval";
import NotFound from "@/pages/NotFound";
import { useRegistrationStatus } from "@/hooks/useRegistrationStatus";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { status, isLoading: statusLoading } = useRegistrationStatus();

  if (loading || (user && statusLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  
  // Check if user is pending approval (no role assigned yet)
  if (status === "pending") {
    return <Navigate to="/pending" replace />;
  }
  
  return (
    <RoleProvider>
      <AppLayout>{children}</AppLayout>
    </RoleProvider>
  );
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
  if (user) return <Navigate to="/" replace />;
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
              <Route path="/pending" element={<PendingApproval />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/khatas" element={<ProtectedRoute><Khatas /></ProtectedRoute>} />
              <Route path="/revenue" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute><RegistrationRequests /></ProtectedRoute>} />
              <Route path="/moderators" element={<ProtectedRoute><ModeratorControl /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NavigationBlockerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
