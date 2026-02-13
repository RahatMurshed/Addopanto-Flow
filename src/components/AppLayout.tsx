import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { usePendingRequestsCount } from "@/hooks/usePendingRequestsCount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Receipt,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  Building2,
  ChevronDown,
  Plus,
  GraduationCap,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Expense Sources", href: "/khatas", icon: Wallet },
  { label: "Revenue", href: "/revenue", icon: TrendingUp },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Students", href: "/students", icon: GraduationCap },
  { label: "Reports", href: "/reports", icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const {
    activeCompany,
    companies,
    switchCompany,
    isCompanyAdmin,
    isCipher,
    canManageMembers,
  } = useCompany();
  const pendingCount = usePendingRequestsCount(); // This hook likely needs updating to be company-aware too
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Build nav items dynamically based on role
  const navItems = [
    ...baseNavItems,
    ...((isCompanyAdmin || isCipher) ? [{ label: "Settings", href: "/settings", icon: Settings }] : []),
    ...(canManageMembers ? [{ label: "Members", href: "/company/members", icon: Users }] : []),
    ...((isCompanyAdmin || isCipher) ? [{ label: "User Management", href: "/users", icon: ShieldCheck }] : []),
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCompanySwitch = async (companyId: string) => {
    await switchCompany(companyId);
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        {/* Company Switcher Header */}
        <div className="flex h-16 items-center border-b border-border px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-2 hover:bg-accent/50">
                <div className="flex items-center gap-2 overflow-hidden">
                  {activeCompany?.logo_url ? (
                    <img src={activeCompany.logo_url} alt="" className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <span className="truncate font-semibold">{activeCompany?.name || "Select Company"}</span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>My Companies</DropdownMenuLabel>
              {companies.map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => handleCompanySwitch(company.id)}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">{company.name}</span>
                  {activeCompany?.id === company.id && <Badge variant="secondary" className="ml-auto text-[10px]">Active</Badge>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/companies/join")} className="gap-2 text-muted-foreground">
                <Plus className="h-4 w-4" /> Join another company
              </DropdownMenuItem>
              {isCipher && (
                <DropdownMenuItem onClick={() => navigate("/companies/create")} className="gap-2 text-muted-foreground">
                  <Plus className="h-4 w-4" /> Create new company
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Layout */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold truncate max-w-[150px]">{activeCompany?.name || "KhataFlow"}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile Nav Overlay */}
        {mobileOpen && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}>
            <nav className="absolute right-0 top-14 w-64 border-l border-border bg-card p-3 shadow-lg h-[calc(100vh-3.5rem)] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/companies")}>
                  <ArrowLeftRight className="h-4 w-4" /> Switch Company
                </Button>
              </div>
              <div className="flex-1 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      location.pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
              <Button variant="ghost" className="mt-2 w-full justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
