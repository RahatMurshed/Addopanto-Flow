import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useModeratorPermissions } from "@/hooks/useModeratorPermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserRoleBadge } from "@/components/UserRoleBadge";
import { RoleGuard } from "@/components/RoleGuard";
import type { AppRole } from "@/hooks/useUserRole";
import { Loader2, Shield, Search, ShieldAlert, TrendingUp, Receipt, FileText, Wallet, ArrowLeftRight } from "lucide-react";
import { SkeletonModeratorCards } from "@/components/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigate } from "react-router-dom";

interface ModeratorUser {
  user_id: string;
  email: string | null;
  created_at: string;
}

function ModeratorPermissionsCard({ userId, email }: { userId: string; email: string | null }) {
  const {
    permissions,
    isLoading,
    updatePermissions,
    isUpdating,
    canAddRevenue,
    canAddExpense,
    canAddExpenseSource,
    canTransfer,
    canViewReports,
  } = useModeratorPermissions(userId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {email || "Moderator"}
        </CardTitle>
        <CardDescription className="text-xs truncate">{userId}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <Label htmlFor={`revenue-${userId}`} className="text-sm">
              Can Add Revenue
            </Label>
          </div>
          <Switch
            id={`revenue-${userId}`}
            checked={canAddRevenue}
            onCheckedChange={(checked) => updatePermissions({ can_add_revenue: checked })}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-destructive" />
            <Label htmlFor={`expense-${userId}`} className="text-sm">
              Can Add Expenses
            </Label>
          </div>
          <Switch
            id={`expense-${userId}`}
            checked={canAddExpense}
            onCheckedChange={(checked) => updatePermissions({ can_add_expense: checked })}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <Label htmlFor={`expense-source-${userId}`} className="text-sm">
              Can Add Expense Sources
            </Label>
          </div>
          <Switch
            id={`expense-source-${userId}`}
            checked={canAddExpenseSource}
            onCheckedChange={(checked) => updatePermissions({ can_add_expense_source: checked })}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            <Label htmlFor={`transfer-${userId}`} className="text-sm">
              Can Transfer
            </Label>
          </div>
          <Switch
            id={`transfer-${userId}`}
            checked={canTransfer}
            onCheckedChange={(checked) => updatePermissions({ can_transfer: checked })}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor={`reports-${userId}`} className="text-sm">
              Can View Reports
            </Label>
          </div>
          <Switch
            id={`reports-${userId}`}
            checked={canViewReports}
            onCheckedChange={(checked) => updatePermissions({ can_view_reports: checked })}
            disabled={isUpdating}
          />
        </div>

        {isUpdating && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ModeratorControl() {
  const { user: currentUser } = useAuth();
  const { isCipher, isAdmin, canManageUsers } = useRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all moderators
  const { data: moderators = [], isLoading } = useQuery({
    queryKey: ["moderators"],
    queryFn: async (): Promise<ModeratorUser[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "moderator");

      if (error) throw error;

      // Fetch emails from user_profiles for all moderators
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, email");

      return (data || []).map((m) => ({
        user_id: m.user_id,
        email: profiles?.find((p) => p.user_id === m.user_id)?.email ?? null,
        created_at: m.created_at,
      }));
    },
    enabled: isAdmin || isCipher,
  });

  // Filter moderators by search query
  const filteredModerators = useMemo(() => {
    if (!searchQuery.trim()) return moderators;
    const query = searchQuery.toLowerCase();
    return moderators.filter(
      (m) =>
        m.email?.toLowerCase().includes(query) ||
        m.user_id.toLowerCase().includes(query)
    );
  }, [moderators, searchQuery]);

  // Redirect if not authorized (after all hooks)
  if (!isAdmin && !isCipher) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-52 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <SkeletonModeratorCards count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moderator Control</h1>
          <p className="text-muted-foreground">Manage moderator permissions</p>
        </div>
      </div>

      <RoleGuard roles={["admin", "cipher"]} fallback={
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </CardContent>
        </Card>
      }>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search moderators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-sm"
          />
        </div>

        {filteredModerators.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Moderators</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                There are no moderators yet. Go to User Management to assign the moderator role to users.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModerators.map((mod) => (
              <ModeratorPermissionsCard
                key={mod.user_id}
                userId={mod.user_id}
                email={mod.email}
              />
            ))}
          </div>
        )}
      </RoleGuard>
    </div>
  );
}
