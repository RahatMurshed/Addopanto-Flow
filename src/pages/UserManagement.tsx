import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { UserRoleBadge } from "@/components/UserRoleBadge";
import { RoleGuard } from "@/components/RoleGuard";
import type { AppRole } from "@/hooks/useUserRole";
import { Loader2, Users, Search, ShieldAlert } from "lucide-react";
import { Navigate } from "react-router-dom";

interface UserWithRole {
  user_id: string;
  email: string | null;
  role: AppRole;
  created_at: string;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { isCipher, isAdmin, canManageUsers, canManageRole } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    userId: string;
    email: string;
    newRole: AppRole;
    currentRole: AppRole;
  } | null>(null);

  // Fetch all users with their roles (filtered by visibility)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");

      if (rolesError) throw rolesError;

      // Get user profiles for emails
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id");

      if (profilesError) throw profilesError;

      // Combine data - we need to get emails from auth.users but we can't query it directly
      // So we'll use the user_id from roles and profiles
      const usersMap = new Map<string, UserWithRole>();

      for (const role of roles || []) {
        usersMap.set(role.user_id, {
          user_id: role.user_id,
          email: null, // Will be filled below if possible
          role: role.role as AppRole,
          created_at: role.created_at,
        });
      }

      // For current user, we can get their email
      if (currentUser && usersMap.has(currentUser.id)) {
        const userEntry = usersMap.get(currentUser.id)!;
        userEntry.email = currentUser.email || null;
      }

      return Array.from(usersMap.values());
    },
    enabled: canManageUsers,
  });

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(query) ||
        u.user_id.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Mutation to change user role
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // First delete existing role
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Then insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: newRole,
          assigned_by: currentUser?.id,
        });

      if (insertError) throw insertError;

      // If changing to moderator, create default permissions
      if (newRole === "moderator") {
        const { error: permError } = await supabase
          .from("moderator_permissions")
          .upsert({
            user_id: userId,
            can_add_revenue: true,
            can_add_expense: true,
            can_view_reports: true,
            controlled_by: currentUser?.id,
          });

        if (permError) throw permError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role updated successfully" });
      setRoleChangeConfirm(null);
    },
    onError: (error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const handleRoleChange = (userId: string, email: string | null, currentRole: AppRole, newRole: AppRole) => {
    // Prevent changing own role
    if (userId === currentUser?.id) {
      toast({ title: "Cannot change your own role", variant: "destructive" });
      return;
    }

    // Check if user can manage this role
    if (!canManageRole(currentRole) || !canManageRole(newRole)) {
      toast({ title: "You don't have permission to manage this role", variant: "destructive" });
      return;
    }

    setRoleChangeConfirm({ userId, email: email || userId, newRole, currentRole });
  };

  const confirmRoleChange = () => {
    if (!roleChangeConfirm) return;
    changeRoleMutation.mutate({
      userId: roleChangeConfirm.userId,
      newRole: roleChangeConfirm.newRole,
    });
  };

  // Available roles based on current user's role
  const availableRoles: AppRole[] = isCipher
    ? ["cipher", "admin", "moderator", "user"]
    : ["admin", "moderator", "user"];

  // Redirect if not authorized (after all hooks)
  if (!canManageUsers) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
            <CardDescription>
              {isCipher
                ? "You can see and manage all users including Cipher accounts."
                : "Cipher accounts are hidden from this view."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email, ID, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Change Role</TableHead>
                      <TableHead>Member Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const isCurrentUser = u.user_id === currentUser?.id;
                      const canModify = canManageRole(u.role) && !isCurrentUser;

                      return (
                        <TableRow key={u.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {u.email || "No email"}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {u.user_id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <UserRoleBadge role={u.role} />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.role}
                              onValueChange={(newRole: AppRole) =>
                                handleRoleChange(u.user_id, u.email, u.role, newRole)
                              }
                              disabled={!canModify || changeRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </RoleGuard>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={!!roleChangeConfirm} onOpenChange={(open) => !open && setRoleChangeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <strong>{roleChangeConfirm?.email}</strong>'s role
              from <strong>{roleChangeConfirm?.currentRole}</strong> to{" "}
              <strong>{roleChangeConfirm?.newRole}</strong>?
              {roleChangeConfirm?.newRole === "moderator" && (
                <span className="block mt-2">
                  Default moderator permissions will be granted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              {changeRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
