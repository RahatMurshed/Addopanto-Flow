import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { format } from "date-fns";
import { Users, Shield, UserPlus, Search, Loader2, Copy, RefreshCw, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import CompanyJoinRequests from "@/components/CompanyJoinRequests";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import { OperatorPermissionMatrix } from "@/components/OperatorPermissionMatrix";

export default function CompanyMembers() {
  const { user } = useAuth();
  const { activeCompanyId, activeCompany, canManageMembers, canViewMembers, isCipher, isCompanyAdmin } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  // Fetch cipher user IDs (only needed for non-cipher users to filter them out)
  const { data: cipherUserIds = [] } = useQuery({
    queryKey: ["cipher-user-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "cipher");
      if (error) throw error;
      return data.map((r) => r.user_id);
    },
    enabled: canViewMembers,
  });

  // Fetch members
  const { data: rawMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["company-members", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("company_memberships")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && canViewMembers,
  });

  // Filter out cipher members for non-cipher users
  const members = useMemo(() => {
    if (isCipher || cipherUserIds.length === 0) return rawMembers;
    return rawMembers.filter((m) => !cipherUserIds.includes(m.user_id));
  }, [rawMembers, cipherUserIds, isCipher]);

  // Fetch member emails
  const { data: profiles = [] } = useQuery({
    queryKey: ["member-profiles", members.map(m => m.user_id)],
    queryFn: async () => {
      if (members.length === 0) return [];
      const userIds = members.map(m => m.user_id);
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      return data ?? [];
    },
    enabled: members.length > 0,
  });

  // Count pending join requests for badge
  const { data: pendingJoinCount = 0 } = useQuery({
    queryKey: ["pending-join-requests-count", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return 0;
      const { count, error } = await supabase
        .from("company_join_requests")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("status", "pending");
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!activeCompanyId && canViewMembers,
  });

  // Fetch invite code directly (admin-only, not in public view)
  const { data: companySecrets } = useQuery({
    queryKey: ["company-secrets", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("invite_code")
        .eq("id", activeCompanyId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!activeCompanyId && canManageMembers,
  });

  const getName = (userId: string) => profiles.find(p => p.user_id === userId)?.full_name || null;
  const getAvatarUrl = (userId: string) => profiles.find(p => p.user_id === userId)?.avatar_url || null;

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("company_memberships")
        .update(updates)
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      toast({ title: "Member updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Remove member
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("company_memberships")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      toast({ title: "Member removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Generate invite code
  const generateInviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("company-join", {
        body: { action: "generate-invite", companyId: activeCompanyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-secrets", activeCompanyId] });
      toast({ title: "Invite code generated", description: data?.inviteCode });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m => {
      const name = getName(m.user_id) || "";
      return name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
    });
  }, [members, search, profiles]);

  if (!canViewMembers) return <Navigate to="/" replace />;

  if (membersLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <SkeletonTable rows={5} columns={7} />
      </div>
    );
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-primary/15 text-primary border-primary/30",
      moderator: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
      viewer: "bg-muted text-muted-foreground",
      data_entry_operator: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
    };
    const labels: Record<string, string> = { data_entry_operator: "Data Entry Operator" };
    return <Badge className={colors[role] || ""}>{labels[role] || role}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business Members</h1>
        <p className="text-muted-foreground">Manage members, permissions, and join requests</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" /> Members ({members.length})
          </TabsTrigger>
          {canManageMembers && (
            <TabsTrigger value="requests" className="gap-2">
              <UserPlus className="h-4 w-4" /> Requests
              {pendingJoinCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">{pendingJoinCount}</Badge>
              )}
            </TabsTrigger>
          )}
          {canManageMembers && (
            <TabsTrigger value="invite" className="gap-2">
              <Shield className="h-4 w-4" /> Invite
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                    <TableHead className="hidden md:table-cell">Revenue</TableHead>
                    <TableHead className="hidden md:table-cell">Expense</TableHead>
                    <TableHead className="hidden lg:table-cell">Exp. Sources</TableHead>
                    <TableHead className="hidden md:table-cell">Transfer</TableHead>
                    <TableHead className="hidden md:table-cell">Reports</TableHead>
                    <TableHead className="hidden lg:table-cell">Students</TableHead>
                    {canManageMembers && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const isCurrentUser = member.user_id === user?.id;
                    const memberIsAdmin = member.role === "admin";
                    // Cipher can manage everyone except themselves; admin can manage non-admins
                    const canModifyMember = !isCurrentUser && (isCipher || (isCompanyAdmin && !memberIsAdmin));
                    // Permissions switches: admins always have all perms, only modifiable if canModifyMember
                    const permsDisabled = !canModifyMember || memberIsAdmin;
                    return (
                      <React.Fragment key={member.id}>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              avatarUrl={getAvatarUrl(member.user_id)}
                              fullName={getName(member.user_id)}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium">
                                {getName(member.user_id) || "Unknown Member"}
                                {isCurrentUser && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isCipher && cipherUserIds.includes(member.user_id) && (
                              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30">Cipher</Badge>
                            )}
                            {!canModifyMember ? (
                              roleBadge(member.role)
                            ) : (
                            <Select
                              value={member.role}
                              onValueChange={(v) => updateMemberMutation.mutate({ memberId: member.id, updates: { role: v } })}
                            >
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {isCipher && <SelectItem value="admin">Admin</SelectItem>}
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="data_entry_operator">Data Entry Operator</SelectItem>
                              </SelectContent>
                            </Select>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {format(new Date(member.joined_at), "MMM d, yyyy")}
                        </TableCell>
                        {["can_add_revenue", "can_add_expense", "can_add_expense_source", "can_transfer", "can_view_reports", "can_manage_students"].map((perm) => (
                          <TableCell key={perm} className={["can_add_expense_source", "can_manage_students"].includes(perm) ? "hidden lg:table-cell" : "hidden md:table-cell"}>
                            <Switch
                              checked={memberIsAdmin || member[perm as keyof typeof member] as boolean}
                              disabled={permsDisabled}
                              onCheckedChange={(v) => updateMemberMutation.mutate({ memberId: member.id, updates: { [perm]: v } })}
                            />
                          </TableCell>
                        ))}
                        {canManageMembers && (
                          <TableCell>
                            {canModifyMember && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setRemovingMemberId(member.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                      {member.role === "data_entry_operator" && canManageMembers && canModifyMember && (
                        <TableRow>
                          <TableCell colSpan={10} className="p-3 border-t-0">
                            <OperatorPermissionMatrix
                              member={member as any}
                              disabled={!canModifyMember}
                              onPermissionChange={(key, value) =>
                                updateMemberMutation.mutate({ memberId: member.id, updates: { [key]: value } })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <CompanyJoinRequests />
        </TabsContent>

        <TabsContent value="invite" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite Settings</CardTitle>
              <CardDescription>Manage invite codes and join password for this business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {companySecrets?.invite_code && (
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Current Invite Code</p>
                    <p className="font-mono text-lg font-bold">{companySecrets.invite_code}</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => {
                    navigator.clipboard.writeText(companySecrets.invite_code!);
                    toast({ title: "Copied!" });
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Button variant="outline" onClick={() => generateInviteMutation.mutate()} disabled={generateInviteMutation.isPending}>
                {generateInviteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {companySecrets?.invite_code ? "Regenerate" : "Generate"} Invite Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingMemberId} onOpenChange={(open) => { if (!open && !removeMemberMutation.isPending) setRemovingMemberId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (removeMemberMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke their access to this business. They can request to join again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMemberMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMemberMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (removingMemberId) {
                  removeMemberMutation.mutate(removingMemberId, {
                    onSuccess: () => setRemovingMemberId(null),
                  });
                }
              }}
            >
              {removeMemberMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing...</>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
