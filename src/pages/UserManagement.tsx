import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { UserRoleBadge } from "@/components/auth/UserRoleBadge";
import { RoleGuard } from "@/components/auth/RoleGuard";
import type { AppRole } from "@/hooks/useUserRole";
import { Loader2, Users, Search, ShieldAlert, Trash2, ChevronDown, Eye } from "lucide-react";
import { SkeletonTable } from "@/components/shared/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigate } from "react-router-dom";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { UserProfileSheet } from "@/components/auth/UserProfileSheet";

interface UserWithRole {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string; // raw role from DB, could be legacy values
  created_at: string;
}

interface PaginationInfo {
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
}

export default function UserManagement() {
  const { user: currentUser, session } = useAuth();
  const { isCipher, canManageRole } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    userId: string;
    email: string;
    newRole: AppRole;
    currentRole: string;
    requiresPassword: boolean;
  } | null>(null);
  const [rolePasswordInput, setRolePasswordInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    userId: string;
    email: string;
    role: string;
  } | null>(null);
  const [deleteEmailInput, setDeleteEmailInput] = useState("");
  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Fetch users with infinite scrolling
  const {
    data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["admin-users", session?.access_token],
    queryFn: async ({ pageParam = 1 }): Promise<{ users: UserWithRole[]; pagination: PaginationInfo }> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?page=${pageParam}&perPage=50`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch users");
      const result = await response.json();
      return {
        users: result.users || [],
        pagination: result.pagination || { page: pageParam, perPage: 50, total: 0, hasMore: false },
      };
    },
    getNextPageParam: (lastPage) => lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    enabled: isCipher && !!session?.access_token,
  });

  const users = useMemo(() => data?.pages.flatMap((page) => page.users) || [], [data]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(query) ||
        u.full_name?.toLowerCase().includes(query) ||
        u.user_id.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Simplified role display: only cipher and user
  const getDisplayRole = (rawRole: string): AppRole => rawRole === "cipher" ? "cipher" : "user";

  // Change role mutation - now routes through edge function
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole, password }: { userId: string; newRole: AppRole; password?: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userId, newRole, ...(password ? { password } : {}) }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to change role");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role updated successfully" });
      setRoleChangeConfirm(null);
      setRolePasswordInput("");
    },
    onError: (error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  // Delete user mutation - now sends password+targetEmail for server-side Cipher verification
  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, password, targetEmail }: { userId: string; password?: string; targetEmail?: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userId, ...(password ? { password } : {}), ...(targetEmail ? { targetEmail } : {}) }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete user");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User deleted successfully" });
      setDeleteConfirm(null);
      setDeleteEmailInput("");
      setDeletePasswordInput("");
    },
    onError: (error) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  const handleRoleChange = (userId: string, email: string | null, currentRole: string, newRole: AppRole) => {
    if (userId === currentUser?.id) {
      toast({ title: "Cannot change your own role", variant: "destructive" });
      return;
    }
    const requiresPassword = newRole === "cipher" || currentRole === "cipher";
    setRoleChangeConfirm({ userId, email: email || userId, newRole, currentRole, requiresPassword });
  };

  const handleDeleteUser = (userId: string, email: string | null, role: string) => {
    if (userId === currentUser?.id) {
      toast({ title: "Cannot delete yourself", variant: "destructive" });
      return;
    }
    setDeleteConfirm({ userId, email: email || userId, role });
  };

  if (!isCipher) return <Navigate to="/" replace />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <SkeletonTable rows={8} columns={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Users</h1>
        <p className="text-muted-foreground">Manage platform-level user roles (Cipher / User)</p>
      </div>

      <RoleGuard roles={["cipher"]} fallback={
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </CardContent>
        </Card>
      }>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({users.length})
            </CardTitle>
            <CardDescription>
              Platform-level management only. Company roles are managed in each business's Members page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Platform Role</TableHead>
                      <TableHead>Member Since</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const isCurrentUser = u.user_id === currentUser?.id;
                      const displayRole = getDisplayRole(u.role);
                      const canChangeRole = !isCurrentUser;
                      const canDelete = !isCurrentUser;

                      return (
                        <TableRow key={u.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <UserAvatar avatarUrl={u.avatar_url} fullName={u.full_name} email={u.email} size="sm" />
                              <div>
                                <p className="font-medium">
                                  {u.full_name || u.email || "No email"}
                                  {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                                </p>
                                {u.full_name && <p className="text-xs text-muted-foreground">{u.email || "No email"}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {canChangeRole ? (
                              <Select
                                value={displayRole}
                                onValueChange={(newRole: AppRole) => handleRoleChange(u.user_id, u.email, u.role, newRole)}
                                disabled={changeRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cipher">Cipher</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <UserRoleBadge role={displayRole} />
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewingUserId(u.user_id)}
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!isCurrentUser && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(u.user_id, u.email, u.role)}
                                  disabled={deleteUserMutation.isPending}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {hasNextPage && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                  Load More
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </RoleGuard>

      {/* Role Change Confirmation */}
      <AlertDialog open={!!roleChangeConfirm} onOpenChange={(open) => { if (!open && !changeRoleMutation.isPending) { setRoleChangeConfirm(null); setRolePasswordInput(""); } }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (changeRoleMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Change <strong>{roleChangeConfirm?.email}</strong>'s platform role from{" "}
                  <strong>{roleChangeConfirm?.currentRole}</strong> to <strong>{roleChangeConfirm?.newRole}</strong>?
                </p>
                {roleChangeConfirm?.requiresPassword && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Cipher role changes require password verification. Enter <strong className="text-foreground">your</strong> password:
                    </p>
                    <Input
                      type="password"
                      value={rolePasswordInput}
                      onChange={(e) => setRolePasswordInput(e.target.value)}
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changeRoleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (roleChangeConfirm) {
                  changeRoleMutation.mutate({
                    userId: roleChangeConfirm.userId,
                    newRole: roleChangeConfirm.newRole,
                    ...(roleChangeConfirm.requiresPassword ? { password: rolePasswordInput } : {}),
                  });
                }
              }}
              disabled={changeRoleMutation.isPending || (roleChangeConfirm?.requiresPassword && !rolePasswordInput.trim())}
            >
              {changeRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {changeRoleMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open && !deleteUserMutation.isPending) { setDeleteConfirm(null); setDeleteEmailInput(""); setDeletePasswordInput(""); } }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deleteUserMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteConfirm?.role === "cipher" ? "Delete Cipher User" : "Delete User"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <>
                  <p>
                    You are about to delete{deleteConfirm?.role === "cipher" ? " a Cipher" : ""} user: <strong>{deleteConfirm?.email}</strong>
                  </p>
                  <p className="text-destructive font-medium">This action cannot be undone.</p>
                  <div className="pt-2 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Type <strong className="text-foreground">{deleteConfirm?.email}</strong> to confirm:
                      </p>
                      <Input value={deleteEmailInput} onChange={(e) => setDeleteEmailInput(e.target.value)} placeholder="Enter their email to confirm" autoComplete="off" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Enter <strong className="text-foreground">your</strong> password to verify identity:
                      </p>
                      <Input type="password" value={deletePasswordInput} onChange={(e) => setDeletePasswordInput(e.target.value)} placeholder="Your password" autoComplete="current-password" />
                    </div>
                  </div>
                </>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!deleteConfirm) return;
                deleteUserMutation.mutate({
                  userId: deleteConfirm.userId,
                  password: deletePasswordInput,
                  targetEmail: deleteEmailInput,
                });
              }}
              disabled={
                deleteUserMutation.isPending ||
                deleteEmailInput !== deleteConfirm?.email ||
                !deletePasswordInput.trim()
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* User Profile Sheet */}
      <UserProfileSheet
        userId={viewingUserId}
        open={!!viewingUserId}
        onOpenChange={(open) => { if (!open) setViewingUserId(null); }}
      />
    </div>
  );
}
