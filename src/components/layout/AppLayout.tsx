import { useState, useEffect } from "react";
import { SkipLink } from "@/components/layout/SkipLink";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Bookmark } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Wallet, TrendingUp, Receipt, FileText, Settings, LogOut, Menu, X,
  Users, UserPlus, Building2, ChevronDown, Plus, GraduationCap, ArrowLeftRight,
  ShieldCheck, Layers, ClipboardList, UserCircle, BookOpen, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import gaLogo from "@/assets/GA-LOGO.png";
import { UserAvatar } from "@/components/auth/UserAvatar";
import CommandPalette from "@/components/layout/CommandPalette";

const baseNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const {
    activeCompany, companies, switchCompany, isCompanyAdmin, isCipher,
    canManageMembers, canViewMembers, isDataEntryOperator,
    canAddStudent, canEditStudent, canDeleteStudent,
    canAddBatch, canEditBatch, canDeleteBatch,
    canAddRevenue, canEditRevenue, canDeleteRevenue,
    canAddExpense, canEditExpense, canDeleteExpense,
    canAddExpenseSource,
    piiAuditMode, togglePiiAuditMode,
  } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Register Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Count pending company creation requests for cipher badge
  const { data: pendingCreationCount = 0 } = useQuery({
    queryKey: ["pending-creation-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("company_creation_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: isCipher,
    refetchInterval: 30000,
  });

  // Count pending join requests for company admin badge
  const { data: pendingJoinCount = 0 } = useQuery({
    queryKey: ["pending-join-count", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return 0;
      const { count, error } = await supabase
        .from("company_join_requests")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompany.id)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: (isCompanyAdmin || isCipher) && !!activeCompany?.id,
    refetchInterval: 30000,
  });

  const showStudents = !isDataEntryOperator || canAddStudent || canEditStudent || canDeleteStudent;
  const showBatches = !isDataEntryOperator || canAddBatch || canEditBatch || canDeleteBatch;
  const showRevenue = !isDataEntryOperator || canAddRevenue || canEditRevenue || canDeleteRevenue;
  const showExpenses = !isDataEntryOperator || canAddExpense || canEditExpense || canDeleteExpense;
  const showKhatas = !isDataEntryOperator || canAddExpenseSource;
  const showReports = !isDataEntryOperator;

  const navItems = [
    ...baseNavItems,
    ...(showBatches ? [{ label: "Courses", href: "/courses", icon: BookOpen }] : []),
    ...(showStudents ? [{ label: "Students", href: "/students", icon: GraduationCap }] : []),
    ...(showKhatas ? [{ label: "Expense Sources", href: "/khatas", icon: Wallet }] : []),
    ...(showRevenue ? [{ label: "Revenue", href: "/revenue", icon: TrendingUp }] : []),
    ...(showExpenses ? [{ label: "Expenses", href: "/expenses", icon: Receipt }] : []),
    ...(showReports ? [{ label: "Reports", href: "/reports", icon: FileText }] : []),
    ...(canViewMembers && !isDataEntryOperator ? [{ label: "Members", href: "/company/members", icon: Users, badge: (isCompanyAdmin || isCipher) ? pendingJoinCount : 0 }] : []),
    ...((isCompanyAdmin || isCipher) && !isDataEntryOperator ? [{ label: "Audit Log", href: "/audit-log", icon: ClipboardList }] : []),
    { label: "Presets", href: "/presets", icon: Bookmark },
    ...(isCipher ? [{ label: "Company Requests", href: "/company-requests", icon: Building2, badge: pendingCreationCount }] : []),
    ...(isCipher ? [{ label: "Platform Users", href: "/users", icon: ShieldCheck }] : []),
    ...((isCompanyAdmin || isCipher) && !isDataEntryOperator ? [{ label: "Settings", href: "/settings", icon: Settings }] : []),
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCompanySwitch = async (companyId: string) => {
    await switchCompany(companyId);
    setMobileOpen(false);
    navigate("/dashboard");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SkipLink />
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col bg-sidebar md:flex" role="navigation" aria-label="Main navigation">
        <div className="flex flex-col items-center gap-2 border-b border-sidebar-border px-4 py-4">
          <Link to="/">
            <img src={gaLogo} alt="Grammar Addopanto" className="h-10 w-auto max-w-[140px] object-contain" />
          </Link>
          {!isDataEntryOperator ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 text-sidebar-foreground hover:bg-sidebar-accent">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {activeCompany?.logo_url ? (
                      <img src={activeCompany.logo_url} alt="" className="h-5 w-5 rounded object-cover" />
                    ) : (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
                        <Building2 className="h-3 w-3" />
                      </div>
                    )}
                    <span className="truncate text-sm font-medium">{activeCompany?.name || "Select Business"}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Businesses</DropdownMenuLabel>
                {companies.map((company) => (
                  <DropdownMenuItem key={company.id} onClick={() => handleCompanySwitch(company.id)} className="gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{company.name}</span>
                    {activeCompany?.id === company.id && <Badge variant="secondary" className="ml-auto text-[10px]">Active</Badge>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/companies/join")} className="gap-2 text-muted-foreground">
                  <Plus className="h-4 w-4" /> Join another business
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/companies/create")} className="gap-2 text-muted-foreground">
                  <Plus className="h-4 w-4" /> {isCipher ? "Create new business" : "Request new business"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="h-3 w-3" />
              </div>
              <span className="truncate text-sm font-medium text-sidebar-foreground">{activeCompany?.name || "Business"}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-primary"
                    : "border-l-[3px] border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {"badge" in item && (item as any).badge > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0.5 min-w-[20px] text-center">
                    {(item as any).badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {isCompanyAdmin && (
            <button
              onClick={togglePiiAuditMode}
              className={cn(
                "mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                piiAuditMode
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
              )}
            >
              <EyeOff className="h-3.5 w-3.5" />
              {piiAuditMode ? "PII Hidden (Audit)" : "Preview as Non-Admin"}
            </button>
          )}
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-medium text-sidebar-foreground/60">Theme</span>
            <ThemeToggle />
          </div>
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              location.pathname === "/profile"
                ? "border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-primary"
                : "border-l-[3px] border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <UserCircle className="h-4 w-4" />
            My Profile
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Layout */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Link to="/">
              <img src={gaLogo} alt="Grammar Addopanto" className="h-8 w-auto object-contain" />
            </Link>
            <span className="font-bold truncate max-w-[120px] text-sm">{activeCompany?.name || ""}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="text-primary" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {mobileOpen && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}>
            <nav className="absolute right-0 top-14 w-64 bg-sidebar p-3 shadow-lg h-[calc(100vh-3.5rem)] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { navigate("/companies"); setMobileOpen(false); }}>
                  <ArrowLeftRight className="h-4 w-4" /> Switch Business
                </Button>
              </div>
              <div className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-primary"
                          : "border-l-[3px] border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {"badge" in item && (item as any).badge > 0 && (
                        <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0.5 min-w-[20px] text-center">
                          {(item as any).badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
              <Button variant="ghost" className="mt-2 w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </nav>
          </div>
        )}

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-6 focus:outline-none">{children}</main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
