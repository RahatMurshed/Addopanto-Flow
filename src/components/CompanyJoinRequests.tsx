import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, Loader2, Clock, XCircle, Wallet, ArrowLeftRight, Trash2, Users2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";

type MemberRole = "moderator" | "data_entry_operator" | "viewer";

interface JoinRequest {
  id: string;
  user_id: string;
  company_id: string;
  status: string;
  message: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  banned_until: string | null;
}

interface ApproveData {
  request: JoinRequest;
  email: string;
  role: MemberRole;
  // moderator permissions
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canAddExpenseSource: boolean;
  canTransfer: boolean;
  canViewReports: boolean;
  canManageStudents: boolean;
  // DEO permissions
  deoStudents: boolean;
  deoPayments: boolean;
  deoBatches: boolean;
  deoFinance: boolean;
}

export default function CompanyJoinRequests() {
  const { session } = useAuth();
  const { activeCompanyId, activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [approveDialog, setApproveDialog] = useState<ApproveData | null>(null);
  const [rejectDialog, setRejectDialog] = useState<JoinRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [acceptRejectedDialog, setAcceptRejectedDialog] = useState<ApproveData | null>(null);

  // Fetch join requests for active company
  const { data: joinRequests = [], isLoading } = useQuery({
    queryKey: ["company-join-requests-admin", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("company_join_requests")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as JoinRequest[];
    },
    enabled: !!activeCompanyId,
  });

  // Fetch user emails for join requests
  const userIds = joinRequests.map((r) => r.user_id);
  const { data: requestProfiles = [] } = useQuery({
    queryKey: ["join-request-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, email, full_name, avatar_url")
        .in("user_id", userIds);
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });

  const getEmail = (userId: string) =>
    requestProfiles.find((p) => p.user_id === userId)?.email || userId.slice(0, 8) + "...";
  const getName = (userId: string) =>
    requestProfiles.find((p) => p.user_id === userId)?.full_name || null;
  const getAvatarUrl = (userId: string) =>
    requestProfiles.find((p) => p.user_id === userId)?.avatar_url || null;

  const pendingRequests = joinRequests.filter((r) => r.status === "pending");
  const rejectedRequests = joinRequests.filter((r) => r.status === "rejected");

  const invokeJoinAction = async (body: Record<string, unknown>) => {
    const { data: result, error } = await supabase.functions.invoke("company-join", {
      method: "POST",
      body,
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result;
  };

  const buildPermissionsPayload = (data: ApproveData) => {
    if (data.role === "viewer") return {};
    if (data.role === "data_entry_operator") {
      return {
        deo_students: data.deoStudents,
        deo_payments: data.deoPayments,
        deo_batches: data.deoBatches,
        deo_finance: data.deoFinance,
      };
    }
    return {
      can_add_revenue: data.canAddRevenue,
      can_add_expense: data.canAddExpense,
      can_add_expense_source: data.canAddExpenseSource,
      can_transfer: data.canTransfer,
      can_view_reports: data.canViewReports,
      can_manage_students: data.canManageStudents,
    };
  };

  const roleLabel = (role: MemberRole) =>
    role === "data_entry_operator" ? "Data Entry Operator" : role === "viewer" ? "Viewer" : "Moderator";

  const buildPermissionsSummary = (data: ApproveData): string => {
    if (data.role === "viewer") return "Read-only access (no permissions)";
    const enabled: string[] = [];
    if (data.role === "data_entry_operator") {
      if (data.deoStudents) enabled.push("Students");
      if (data.deoPayments) enabled.push("Payments");
      if (data.deoBatches) enabled.push("Batches");
      if (data.deoFinance) enabled.push("Finance");
    } else {
      if (data.canAddRevenue) enabled.push("Revenue");
      if (data.canAddExpense) enabled.push("Expense");
      if (data.canAddExpenseSource) enabled.push("Expense Sources");
      if (data.canTransfer) enabled.push("Transfer");
      if (data.canViewReports) enabled.push("Reports");
      if (data.canManageStudents) enabled.push("Students");
    }
    return enabled.length > 0 ? enabled.join(", ") : "No permissions enabled";
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (data: ApproveData) => {
      return invokeJoinAction({
        action: "approve-join-request",
        requestId: data.request.id,
        companyId: activeCompanyId,
        role: data.role,
        permissions: buildPermissionsPayload(data),
      });
    },
    onSuccess: (_result, data) => {
      toast({
        title: "Join request approved",
        description: `${data.email} added as ${roleLabel(data.role)}. Permissions: ${buildPermissionsSummary(data)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["company-join-requests-admin", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["pending-join-requests-count"] });
      setApproveDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (request: JoinRequest) => {
      return invokeJoinAction({
        action: "reject-join-request",
        requestId: request.id,
        companyId: activeCompanyId,
        reason: rejectionReason || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Join request rejected", description: "User has been rejected and banned for 1 day." });
      queryClient.invalidateQueries({ queryKey: ["company-join-requests-admin", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["pending-join-requests-count"] });
      setRejectDialog(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    },
  });

  // Accept from rejected mutation
  const acceptRejectedMutation = useMutation({
    mutationFn: async (data: ApproveData) => {
      return invokeJoinAction({
        action: "accept-rejected-join-request",
        requestId: data.request.id,
        companyId: activeCompanyId,
        targetUserId: data.request.user_id,
        role: data.role,
        permissions: buildPermissionsPayload(data),
      });
    },
    onSuccess: (_result, data) => {
      toast({
        title: "User accepted",
        description: `${data.email} added as ${roleLabel(data.role)}. Permissions: ${buildPermissionsSummary(data)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["company-join-requests-admin", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      setAcceptRejectedDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept", description: error.message, variant: "destructive" });
    },
  });

  // Track suggestion context for each dialog
  const [approveHint, setApproveHint] = useState<string>("");
  const [acceptHint, setAcceptHint] = useState<string>("");
  const [approvePrevRole, setApprovePrevRole] = useState<string | null>(null);
  const [acceptPrevRole, setAcceptPrevRole] = useState<string | null>(null);

  const defaultApproveData = (request: JoinRequest, role: MemberRole = "moderator"): ApproveData => ({
    request,
    email: getEmail(request.user_id),
    role,
    canAddRevenue: false,
    canAddExpense: false,
    canAddExpenseSource: false,
    canTransfer: false,
    canViewReports: false,
    canManageStudents: false,
    deoStudents: false,
    deoPayments: false,
    deoBatches: false,
    deoFinance: false,
  });

  // Lookup previous membership role for a user
  const lookupPreviousRole = async (userId: string): Promise<string | null> => {
    if (!activeCompanyId) return null;
    // Check audit logs for a previous membership deletion
    const { data } = await supabase
      .from("company_memberships")
      .select("role")
      .eq("company_id", activeCompanyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return data.role;
    return null;
  };

  const openApproveDialog = async (request: JoinRequest) => {
    // Password join requests default to Moderator
    setApproveHint("Suggested: Moderator (password join)");
    setApprovePrevRole(null);
    setApproveDialog(defaultApproveData(request, "moderator"));
    // Check for previous role asynchronously
    const prev = await lookupPreviousRole(request.user_id);
    if (prev && prev !== "admin") setApprovePrevRole(prev);
  };

  const openAcceptRejectedDialog = async (request: JoinRequest) => {
    // Re-accepting rejected users defaults to Viewer (least privilege)
    setAcceptHint("Suggested: Viewer (re-accepting rejected user)");
    setAcceptPrevRole(null);
    setAcceptRejectedDialog(defaultApproveData(request, "viewer"));
    const prev = await lookupPreviousRole(request.user_id);
    if (prev && prev !== "admin") setAcceptPrevRole(prev);
  };

  const handleRoleChange = (
    newRole: MemberRole,
    current: ApproveData,
    setter: (d: ApproveData) => void,
  ) => {
    setter(defaultApproveData(current.request, newRole));
  };

  const RoleSelector = ({
    data,
    onRoleChange,
    hint,
    previousRole,
  }: {
    data: ApproveData;
    onRoleChange: (role: MemberRole) => void;
    hint?: string;
    previousRole?: string | null;
  }) => (
    <div className="space-y-1.5 py-2">
      <Label>Role</Label>
      <Select value={data.role} onValueChange={(v) => onRoleChange(v as MemberRole)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="moderator">Moderator</SelectItem>
          <SelectItem value="data_entry_operator">Data Entry Operator</SelectItem>
          <SelectItem value="viewer">Viewer</SelectItem>
        </SelectContent>
      </Select>
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {previousRole && (
        <p className="text-xs text-muted-foreground italic">
          Previously assigned as: {roleLabel(previousRole as MemberRole)}
        </p>
      )}
    </div>
  );

  const PermissionToggles = ({
    data,
    onChange,
  }: {
    data: ApproveData;
    onChange: (updated: ApproveData) => void;
  }) => {
    if (data.role === "viewer") {
      return (
        <div className="py-4 text-sm text-muted-foreground">
          Viewers have read-only access. No permissions to configure.
        </div>
      );
    }

    if (data.role === "data_entry_operator") {
      return (
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label>Students</Label>
            <Switch checked={data.deoStudents} onCheckedChange={(c) => onChange({ ...data, deoStudents: c })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Payments</Label>
            <Switch checked={data.deoPayments} onCheckedChange={(c) => onChange({ ...data, deoPayments: c })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Batches</Label>
            <Switch checked={data.deoBatches} onCheckedChange={(c) => onChange({ ...data, deoBatches: c })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Finance</Label>
            <Switch checked={data.deoFinance} onCheckedChange={(c) => onChange({ ...data, deoFinance: c })} />
          </div>
        </div>
      );
    }

    // Moderator
    return (
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <Label>Can Add Revenue</Label>
          <Switch checked={data.canAddRevenue} onCheckedChange={(c) => onChange({ ...data, canAddRevenue: c })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Can Add Expense</Label>
          <Switch checked={data.canAddExpense} onCheckedChange={(c) => onChange({ ...data, canAddExpense: c })} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <Label>Can Add Expense Sources</Label>
          </div>
          <Switch checked={data.canAddExpenseSource} onCheckedChange={(c) => onChange({ ...data, canAddExpenseSource: c })} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            <Label>Can Transfer</Label>
          </div>
          <Switch checked={data.canTransfer} onCheckedChange={(c) => onChange({ ...data, canTransfer: c })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Can View Reports</Label>
          <Switch checked={data.canViewReports} onCheckedChange={(c) => onChange({ ...data, canViewReports: c })} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-muted-foreground" />
            <Label>Can Manage Students</Label>
          </div>
          <Switch checked={data.canManageStudents} onCheckedChange={(c) => onChange({ ...data, canManageStudents: c })} />
        </div>
      </div>
    );
  };

  if (!activeCompanyId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select a business to view join requests.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Business Join Requests</CardTitle>
          <CardDescription>
            Review join requests for <span className="font-medium">{activeCompany?.name}</span>. Review join requests and assign roles with configurable permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
              <SkeletonTable rows={3} columns={4} />
            </div>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected ({rejectedRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No pending join requests
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                avatarUrl={getAvatarUrl(request.user_id)}
                                fullName={getName(request.user_id)}
                                email={getEmail(request.user_id)}
                                size="sm"
                              />
                              <div>
                                <p className="font-medium">{getName(request.user_id) || getEmail(request.user_id)}</p>
                                {getName(request.user_id) && <p className="text-xs text-muted-foreground">{getEmail(request.user_id)}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            {request.message ? (
                              <p className="whitespace-pre-wrap break-words text-sm font-medium text-foreground bg-muted/50 rounded-md px-2.5 py-1.5 border border-border/50">
                                {request.message}
                              </p>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(request.requested_at), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                                onClick={() => openApproveDialog(request)}
                              >
                                <Check className="h-4 w-4" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-destructive hover:bg-destructive/10"
                                onClick={() => setRejectDialog(request)}
                              >
                                <X className="h-4 w-4" /> Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="rejected" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rejected</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Ban Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No rejected join requests
                        </TableCell>
                      </TableRow>
                    ) : (
                      rejectedRequests.map((request) => {
                        const isBanned = request.banned_until && new Date(request.banned_until) > new Date();
                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <UserAvatar
                                  avatarUrl={getAvatarUrl(request.user_id)}
                                  fullName={getName(request.user_id)}
                                  email={getEmail(request.user_id)}
                                  size="sm"
                                />
                                <div>
                                  <p className="font-medium">{getName(request.user_id) || getEmail(request.user_id)}</p>
                                  {getName(request.user_id) && <p className="text-xs text-muted-foreground">{getEmail(request.user_id)}</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.reviewed_at ? format(new Date(request.reviewed_at), "MMM d, yyyy h:mm a") : "-"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                              {request.rejection_reason || "-"}
                            </TableCell>
                            <TableCell>
                              {isBanned ? (
                                <Badge variant="destructive" className="text-xs">
                                  {format(new Date(request.banned_until!), "MMM d, h:mm a")}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Expired</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                                onClick={() => openAcceptRejectedDialog(request)}
                              >
                                <Check className="h-4 w-4" /> Accept
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog
        open={!!approveDialog}
        onOpenChange={(open) => { if (!open && !approveMutation.isPending) setApproveDialog(null); }}
      >
        <DialogContent
          onInteractOutside={(e) => { if (approveMutation.isPending) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (approveMutation.isPending) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
            <DialogDescription>
              Configure role and permissions for <span className="font-medium">{approveDialog?.email}</span>. They will be added as a <strong>{approveDialog ? roleLabel(approveDialog.role) : "Moderator"}</strong>.
            </DialogDescription>
          </DialogHeader>
          {approveDialog && (
            <>
              <RoleSelector data={approveDialog} onRoleChange={(r) => handleRoleChange(r, approveDialog, setApproveDialog)} hint={approveHint} previousRole={approvePrevRole} />
              <PermissionToggles data={approveDialog} onChange={setApproveDialog} />
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium text-foreground">Summary</p>
                <p className="text-muted-foreground">
                  <strong>{approveDialog.email}</strong> will be added as <strong>{roleLabel(approveDialog.role)}</strong>
                </p>
                <p className="text-muted-foreground">
                  Permissions: {buildPermissionsSummary(approveDialog)}
                </p>
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)} disabled={approveMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => approveDialog && approveMutation.mutate(approveDialog)}
              disabled={approveMutation.isPending}
              className="gap-2"
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {approveMutation.isPending ? "Approving..." : "Approve & Add to Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept from Rejected Dialog */}
      <Dialog
        open={!!acceptRejectedDialog}
        onOpenChange={(open) => { if (!open && !acceptRejectedMutation.isPending) setAcceptRejectedDialog(null); }}
      >
        <DialogContent
          onInteractOutside={(e) => { if (acceptRejectedMutation.isPending) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (acceptRejectedMutation.isPending) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Accept Rejected User</DialogTitle>
            <DialogDescription>
              Re-accept <span className="font-medium">{acceptRejectedDialog?.email}</span> and add them as a <strong>{acceptRejectedDialog ? roleLabel(acceptRejectedDialog.role) : "Moderator"}</strong>. The ban will be lifted.
            </DialogDescription>
          </DialogHeader>
          {acceptRejectedDialog && (
            <>
              <RoleSelector data={acceptRejectedDialog} onRoleChange={(r) => handleRoleChange(r, acceptRejectedDialog, setAcceptRejectedDialog)} hint={acceptHint} previousRole={acceptPrevRole} />
              <PermissionToggles data={acceptRejectedDialog} onChange={setAcceptRejectedDialog} />
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium text-foreground">Summary</p>
                <p className="text-muted-foreground">
                  <strong>{acceptRejectedDialog.email}</strong> will be added as <strong>{roleLabel(acceptRejectedDialog.role)}</strong>
                </p>
                <p className="text-muted-foreground">
                  Permissions: {buildPermissionsSummary(acceptRejectedDialog)}
                </p>
              </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptRejectedDialog(null)} disabled={acceptRejectedMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => acceptRejectedDialog && acceptRejectedMutation.mutate(acceptRejectedDialog)}
              disabled={acceptRejectedMutation.isPending}
              className="gap-2"
            >
              {acceptRejectedMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {acceptRejectedMutation.isPending ? "Accepting..." : "Accept & Add to Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog
        open={!!rejectDialog}
        onOpenChange={(open) => { if (!open && !rejectMutation.isPending) setRejectDialog(null); }}
      >
        <AlertDialogContent onEscapeKeyDown={(e) => { if (rejectMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Join Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject <span className="font-medium">{rejectDialog ? getEmail(rejectDialog.user_id) : ""}</span>?
              They will be banned from requesting to join this company for 1 day.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="join-rejection-reason">Reason (optional)</Label>
            <Textarea
              id="join-rejection-reason"
              placeholder="Enter a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              disabled={rejectMutation.isPending}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason("")} disabled={rejectMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                rejectDialog && rejectMutation.mutate(rejectDialog);
              }}
              disabled={rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {rejectMutation.isPending ? "Rejecting..." : "Reject (1-day ban)"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
