import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
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
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AccessGuard, ACCESS_RULES } from "@/components/auth/AccessGuard";
import AppLayout from "@/components/layout/AppLayout";

function AccessDenied() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
      <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
      <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
    </div>
  );
}

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
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const CompanyMembers = lazy(() => import("@/pages/CompanyMembers"));
const Batches = lazy(() => import("@/pages/Batches"));
const BatchDetail = lazy(() => import("@/pages/BatchDetail"));
const Courses = lazy(() => import("@/pages/Courses"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const CompanyCreationRequests = lazy(() => import("@/pages/CompanyCreationRequests"));
const PresetsManagement = lazy(() => import("@/pages/PresetsManagement"));
const AddStudent = lazy(() => import("@/pages/AddStudent"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
});

function BrandedLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 animate-[spin_2.5s_linear_infinite] rounded-full border-[3px] border-transparent border-t-primary" />
        <div className="absolute h-10 w-10 animate-[spin_1.8s_linear_infinite_reverse] rounded-full border-[3px] border-transparent border-b-secondary" />
        <div className="h-3 w-3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
      </div>
      <p className="mt-6 text-xs font-medium tracking-widest uppercase text-muted-foreground animate-[pulse_2s_ease-in-out_infinite]">
        Loading
      </p>
    </div>
  );
}

function ContentLoader() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-12 w-12 animate-[spin_2.5s_linear_infinite] rounded-full border-[3px] border-transparent border-t-primary" />
        <div className="absolute h-7 w-7 animate-[spin_1.8s_linear_infinite_reverse] rounded-full border-[3px] border-transparent border-b-secondary" />
        <div className="h-2.5 w-2.5 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
      </div>
      <p className="mt-5 text-xs font-medium tracking-widest uppercase text-muted-foreground animate-[pulse_2s_ease-in-out_infinite]">
        Loading
      </p>
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

  if (window.location.pathname.startsWith("/companies")) {
    if (isLoading) return <BrandedLoader />;
    return <>{children}</>;
  }

  if (isLoading) {
    return <AppLayout><ContentLoader /></AppLayout>;
  }

  if (!hasCompanies) return <Navigate to="/companies" replace />;
  if (!activeCompany) return <Navigate to="/companies" replace />;

  return (
    <AppLayout>
      <Suspense fallback={<ContentLoader />}>{children}</Suspense>
    </AppLayout>
  );
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
                  <Route path="/revenue" element={<ProtectedRoute><AccessGuard rules={[ACCESS_RULES.deoRevenue]}><Revenue /></AccessGuard></ProtectedRoute>} />
                  <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                  <Route path="/students" element={<ProtectedRoute><AccessGuard rules={[ACCESS_RULES.deoStudents]}><Students /></AccessGuard></ProtectedRoute>} />
                  <Route path="/students/new" element={<ProtectedRoute><AccessGuard rules={[ACCESS_RULES.deoStudents]}><AddStudent /></AccessGuard></ProtectedRoute>} />
                  <Route path="/students/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
                  <Route path="/courses" element={<ProtectedRoute><AccessGuard rules={[ACCESS_RULES.deoCourses]}><Courses /></AccessGuard></ProtectedRoute>} />
                  <Route path="/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
                  <Route path="/batches" element={<Navigate to="/courses" replace />} />
                  <Route path="/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute><RoleGuard roles={["cipher"]} fallback={<AccessDenied />}><UserManagement /></RoleGuard></ProtectedRoute>} />
                  <Route path="/company/members" element={<ProtectedRoute><AccessGuard rules={[ACCESS_RULES.deoMembers]}><CompanyMembers /></AccessGuard></ProtectedRoute>} />
                  <Route path="/company-requests" element={<ProtectedRoute><CompanyCreationRequests /></ProtectedRoute>} />
                  <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
                  <Route path="/presets" element={<ProtectedRoute><PresetsManagement /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  
                  {/* Redirect old routes */}
                  <Route path="/requests" element={<Navigate to="/company/members" replace />} />
                  
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
