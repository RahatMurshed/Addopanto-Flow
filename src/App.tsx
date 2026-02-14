import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider, useCompany } from "@/contexts/CompanyContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { NavigationBlockerProvider } from "@/contexts/NavigationBlockerContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import AppLayout from "@/components/AppLayout";
import gaLogo from "@/assets/GA-LOGO.png";

// Lazy-loaded page components for code splitting
const Auth = lazy(() => import("@/pages/Auth"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Khatas = lazy(() => import("@/pages/Khatas"));
const Revenue = lazy(() => import("@/pages/Revenue"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Reports = lazy(() => import("@/pages/Reports"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Students = lazy(() => import("@/pages/Students"));
const StudentDetail = lazy(() => import("@/pages/StudentDetail"));
const CompanySelection = lazy(() => import("@/pages/CompanySelection"));
const JoinCompany = lazy(() => import("@/pages/JoinCompany"));
const CreateCompany = lazy(() => import("@/pages/CreateCompany"));
const RegistrationRequests = lazy(() => import("@/pages/RegistrationRequests"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const CompanyMembers = lazy(() => import("@/pages/CompanyMembers"));
const Batches = lazy(() => import("@/pages/Batches"));
const BatchDetail = lazy(() => import("@/pages/BatchDetail"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
});

function BrandedLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img src={gaLogo} alt="Grammar Addopanto" className="h-20 w-auto animate-brand-pulse" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <BrandedLoader />;
  if (!user) return <Navigate to="/" replace />;

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
  useRealtimeSync();

  if (isLoading) return <BrandedLoader />;

  if (window.location.pathname.startsWith("/companies")) {
    return <>{children}</>;
  }

  if (!hasCompanies) return <Navigate to="/companies" replace />;
  if (!activeCompany) return <Navigate to="/companies" replace />;

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <BrandedLoader />;
  if (user) return <Navigate to="/companies" replace />;
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NavigationBlockerProvider>
              <Suspense fallback={<BrandedLoader />}>
                <Routes>
                  <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
                  <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                  
                  <Route path="/companies" element={<ProtectedRoute><CompanySelection /></ProtectedRoute>} />
                  <Route path="/companies/join" element={<ProtectedRoute><JoinCompany /></ProtectedRoute>} />
                  <Route path="/companies/create" element={<ProtectedRoute><CreateCompany /></ProtectedRoute>} />

                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/khatas" element={<ProtectedRoute><Khatas /></ProtectedRoute>} />
                  <Route path="/revenue" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
                  <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                  <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
                  <Route path="/students/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
                  <Route path="/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
                  <Route path="/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/requests" element={<ProtectedRoute><RegistrationRequests /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                  <Route path="/company/members" element={<ProtectedRoute><CompanyMembers /></ProtectedRoute>} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </NavigationBlockerProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
