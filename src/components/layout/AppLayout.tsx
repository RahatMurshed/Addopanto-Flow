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
  ShieldCheck, Layers, ClipboardList, UserCircle, BookOpen, Briefcase, Package,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import gaLogo from "@/assets/GA-LOGO.png";
import { UserAvatar } from "@/components/auth/UserAvatar";
import CommandPalette from "@/components/layout/CommandPalette";

const baseNavItems: Array<{ label: string; href: string; icon: any; badge?: number }> = [];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const {
    activeCompany, companies, switchCompany, isCompanyAdmin, isCipher,
    canManageMembers, canViewMembers, isModerator, isDataEntryModerator, isTraditionalModerator,
    canAddStudent, canEditStudent, canDeleteStudent,
    canAddBatch, canEditBatch, canDeleteBatch,
    canAddCourse, canEditCourse, canDeleteCourse,
    canAddRevenue, canEditRevenue, canDeleteRevenue,
    canAddExpense, canEditExpense, canDeleteExpense,
    canAddExpenseSource,
    canViewReports,
    canViewEmployees, canManageEmployees,
    canViewCourses, canViewBatches, canViewRevenue, canViewExpense,
    isLoading: companyLoading,
    isViewer,
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

  // Build navigation based on role — empty while loading to prevent flash
  const buildNavItems = () => {
    if (companyLoading) return [];
    const items: Array<{ label: string; href: string; icon: any; badge?: number }> = [...baseNavItems];

    // Viewer: full read-only navigation (same as admin/cipher)
    if (isViewer) {
      items.push({ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard });
      items.push({ label: "Courses", href: "/courses", icon: BookOpen });
      items.push({ label: "Products", href: "/products", icon: Package });
      items.push({ label: "Students", href: "/students", icon: GraduationCap });
      items.push({ label: "Employees", href: "/employees", icon: Briefcase });
      items.push({ label: "Expense Sources", href: "/khatas", icon: Wallet });
      items.push({ label: "Revenue", href: "/revenue", icon: TrendingUp });
      items.push({ label: "Expenses", href: "/expenses", icon: Receipt });
      items.push({ label: "Reports", href: "/reports", icon: FileText });
      items.push({ label: "Investors & Loans", href: "/stakeholders", icon: Handshake });
      items.push({ label: "Audit Log", href: "/audit-log", icon: ClipboardList });
      return items;
    }

    // Dashboard: admin/cipher only
    if (!isModerator) {
      items.push({ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard });
    }

    if (isDataEntryModerator) {
      if (canAddStudent || canEditStudent || canDeleteStudent) {
        items.push({ label: "Students", href: "/students", icon: GraduationCap });
      }
      if (canAddExpense || canEditExpense || canDeleteExpense) {
        items.push({ label: "My Expenses", href: "/expenses", icon: Receipt });
      }
    } else if (isTraditionalModerator) {
      if (canViewCourses) {
        items.push({ label: "Courses", href: "/courses", icon: BookOpen });
      }
      if (canAddStudent || canEditStudent || canDeleteStudent) {
        items.push({ label: "Students", href: "/students", icon: GraduationCap });
      }
      if (canViewEmployees) {
        items.push({ label: "Employees", href: "/employees", icon: Briefcase });
      }
      if (canViewRevenue || canAddRevenue) {
        items.push({ label: "Revenue", href: "/revenue", icon: TrendingUp });
      }
      if (canViewExpense || canAddExpense) {
        items.push({ label: "Expenses", href: "/expenses", icon: Receipt });
      }
    } else {
      // Admin/Cipher: full navigation
      items.push({ label: "Courses", href: "/courses", icon: BookOpen });
      items.push({ label: "Products", href: "/products", icon: Package });
      items.push({ label: "Students", href: "/students", icon: GraduationCap });
      items.push({ label: "Employees", href: "/employees", icon: Briefcase });
      
      items.push({ label: "Expense Sources", href: "/khatas", icon: Wallet });
      items.push({ label: "Revenue", href: "/revenue", icon: TrendingUp });
      items.push({ label: "Expenses", href: "/expenses", icon: Receipt });
      items.push({ label: "Reports", href: "/reports", icon: FileText });
      items.push({ label: "Members", href: "/company/members", icon: Users, badge: (isCompanyAdmin || isCipher) ? pendingJoinCount : 0 });
      items.push({ label: "Audit Log", href: "/audit-log", icon: ClipboardList });

      if (isCipher) {
        items.push({ label: "Investors & Loans", href: "/stakeholders", icon: Handshake });
        items.push({ label: "Company Requests", href: "/company-requests", icon: Building2, badge: pendingCreationCount });
        items.push({ label: "Platform Users", href: "/users", icon: ShieldCheck });
      }

      items.push({ label: "Settings", href: "/settings", icon: Settings });
    }

    return items;
  };

  const navItems = buildNavItems();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCompanySwitch = async (companyId: string) => {
    await switchCompany(companyId);
    setMobileOpen(false);
    navigate("/dashboard");
  };

  const showCompanySwitcher = !isDataEntryModerator;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SkipLink />
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col bg-sidebar md:flex" role="navigation" aria-label="Main navigation">
        <div className="flex flex-col items-center gap-2 border-b border-sidebar-border px-4 py-3">
          <Link to="/">
            <img src={gaLogo} alt="Addopanto Flow" className="h-12 w-12 object-contain" />
          </Link>
          {companyLoading ? null : showCompanySwitcher ? (
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
              {activeCompany?.logo_url ? (
                <img src={activeCompany.logo_url} alt="" className="h-5 w-5 rounded object-cover" />
              ) : (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
                  <Building2 className="h-3 w-3" />
                </div>
              )}
              <span className="truncate text-sm font-medium text-sidebar-foreground">{activeCompany?.name || "Business"}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto sidebar-nav-scroll">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href + "/"));
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

        {!companyLoading && (
          <div className="border-t border-sidebar-border p-3">
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
        )}
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
            <Button variant="ghost" size="icon" className="text-primary" aria-label="Open navigation menu" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {mobileOpen && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}>
            <nav className="absolute right-0 top-14 w-64 bg-sidebar p-3 shadow-lg h-[calc(100vh-3.5rem)] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {showCompanySwitcher && (
                <div className="mb-4">
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { navigate("/companies"); setMobileOpen(false); }}>
                    <ArrowLeftRight className="h-4 w-4" /> Switch Business
                  </Button>
                </div>
              )}
              <div className="flex-1 space-y-1 overflow-y-auto sidebar-nav-scroll">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href + "/"));
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
              <div className="border-t border-sidebar-border pt-2 mt-2 space-y-1">
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
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
                <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
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
