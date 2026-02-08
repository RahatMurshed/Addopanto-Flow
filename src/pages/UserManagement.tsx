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
import { Loader2, Users, Search, ShieldAlert, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";

interface UserWithRole {
  user_id: string;
  email: string | null;
  role: AppRole;
  created_at: string;
}

export default function UserManagement() {
  const { user: currentUser, session } = useAuth();
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
  const [deleteConfirm, setDeleteConfirm] = useState<{
    userId: string;
    email: string;
    role: AppRole;
  } | null>(null);

  // Fetch all users with their roles and emails via edge function
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserWithRole[]> => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        method: "GET",
      });

      if (error) throw error;
      return data.users || [];
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

  // Mutation to delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: { userId },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (error) {
        const errAny = error as any;
        const ctx = errAny?.context as Response | undefined;

        // If we have a Response context, try to extract the JSON error body.
        if (ctx) {
          const contentType = ctx.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            const payload = await ctx.json().catch(() => null);
            const message =
              payload?.details
                ? `${payload.error}: ${payload.details}`
                : payload?.error || errAny?.message || "Failed to delete user";
            throw new Error(message);
          }

          const text = await ctx.text().catch(() => "");
          throw new Error(text || errAny?.message || "Failed to delete user");
        }

        throw new Error(errAny?.message || "Failed to delete user");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User deleted successfully" });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
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

  const handleDeleteUser = (userId: string, email: string | null, role: AppRole) => {
    // Prevent deleting self
    if (userId === currentUser?.id) {
      toast({ title: "Cannot delete yourself", variant: "destructive" });
      return;
    }

    // Check if user can manage this role
    if (!canManageRole(role)) {
      toast({ title: "You don't have permission to delete this user", variant: "destructive" });
      return;
    }

    setDeleteConfirm({ userId, email: email || userId, role });
  };

  const confirmDeleteUser = () => {
    if (!deleteConfirm) return;
    deleteUserMutation.mutate(deleteConfirm.userId);
  };

  // Available roles based on current user's role (removed "user" option)
  const availableRoles: AppRole[] = isCipher
    ? ["cipher", "admin", "moderator"]
    : ["admin", "moderator"];

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
                      <TableHead className="w-[80px]">Actions</TableHead>
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
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(u.user_id, u.email, u.role)}
                              disabled={!canModify || deleteUserMutation.isPending}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.email}</strong>?
              <span className="block mt-2 text-destructive font-medium">
                This action cannot be undone. All user data will be permanently removed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
