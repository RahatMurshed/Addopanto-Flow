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
import { Check, X, Loader2, Clock, XCircle, Shield, ShieldCheck, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonTable } from "@/components/shared/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { Checkbox } from "@/components/ui/checkbox";

type ApprovalRole = "admin" | "moderator";

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
  role: ApprovalRole;
  dataEntryMode: boolean;
  // DEO permissions (data entry mode ON)
  deoStudents: boolean;
  deoPayments: boolean;
  deoRevenue: boolean;
  deoExpenses: boolean;
  deoBatches: boolean;
  deoCourses: boolean;
  // Full moderator permissions (data entry mode OFF)
  modStudentsAdd: boolean;
  modStudentsEdit: boolean;
  modStudentsDelete: boolean;
  modPaymentsAdd: boolean;
  modPaymentsEdit: boolean;
  modPaymentsDelete: boolean;
  modBatchesAdd: boolean;
  modBatchesEdit: boolean;
  modBatchesDelete: boolean;
  modRevenueAdd: boolean;
  modRevenueEdit: boolean;
  modRevenueDelete: boolean;
  modExpensesAdd: boolean;
  modExpensesEdit: boolean;
  modExpensesDelete: boolean;
  canViewReports: boolean;
  canManageStudents: boolean;
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
    if (data.role === "admin") return {};
    if (data.dataEntryMode) {
      return {
        data_entry_mode: true,
        deo_students: data.deoStudents,
        deo_finance: data.deoExpenses,
      };
    }
    return {
      data_entry_mode: false,
      mod_students_add: data.modStudentsAdd,
      mod_students_edit: data.modStudentsEdit,
      mod_students_delete: data.modStudentsDelete,
      mod_payments_add: data.modPaymentsAdd,
      mod_payments_edit: data.modPaymentsEdit,
      mod_payments_delete: data.modPaymentsDelete,
      mod_batches_add: data.modBatchesAdd,
      mod_batches_edit: data.modBatchesEdit,
      mod_batches_delete: data.modBatchesDelete,
      mod_revenue_add: data.modRevenueAdd,
      mod_revenue_edit: data.modRevenueEdit,
      mod_revenue_delete: data.modRevenueDelete,
      mod_expenses_add: data.modExpensesAdd,
      mod_expenses_edit: data.modExpensesEdit,
      mod_expenses_delete: data.modExpensesDelete,
      can_view_reports: data.canViewReports,
      can_manage_students: data.canManageStudents,
    };
  };

  const roleLabel = (role: ApprovalRole, deo?: boolean) => {
    if (role === "admin") return "Admin";
    return deo ? "Moderator (Data Entry Mode)" : "Moderator";
  };

  const buildPermissionsSummary = (data: ApproveData): string => {
    if (data.role === "admin") return "Full company access";
    const enabled: string[] = [];
    if (data.dataEntryMode) {
      if (data.deoStudents) enabled.push("Students");
      if (data.deoExpenses) enabled.push("Expenses");
    } else {
      if (data.modStudentsAdd || data.modStudentsEdit || data.modStudentsDelete) enabled.push("Students");
      if (data.modPaymentsAdd || data.modPaymentsEdit || data.modPaymentsDelete) enabled.push("Payments");
      if (data.modBatchesAdd || data.modBatchesEdit || data.modBatchesDelete) enabled.push("Batches");
      
      if (data.modRevenueAdd || data.modRevenueEdit || data.modRevenueDelete) enabled.push("Revenue");
      if (data.modExpensesAdd || data.modExpensesEdit || data.modExpensesDelete) enabled.push("Expenses");
      if (data.canViewReports) enabled.push("Reports");
      if (data.canManageStudents) enabled.push("Members");
    }
    return enabled.length > 0 ? enabled.join(", ") : "No permissions enabled";
  };

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
        description: `${data.email} added as ${roleLabel(data.role, data.dataEntryMode)}`,
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
        description: `${data.email} added as ${roleLabel(data.role, data.dataEntryMode)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["company-join-requests-admin", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      setAcceptRejectedDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept", description: error.message, variant: "destructive" });
    },
  });

  const defaultApproveData = (request: JoinRequest, role: ApprovalRole = "moderator"): ApproveData => ({
    request,
    email: getEmail(request.user_id),
    role,
    dataEntryMode: false,
    deoStudents: false,
    deoPayments: false,
    deoRevenue: false,
    deoExpenses: false,
    deoBatches: false,
    deoCourses: false,
    modStudentsAdd: false, modStudentsEdit: false, modStudentsDelete: false,
    modPaymentsAdd: false, modPaymentsEdit: false, modPaymentsDelete: false,
    modBatchesAdd: false, modBatchesEdit: false, modBatchesDelete: false,
    
    modRevenueAdd: false, modRevenueEdit: false, modRevenueDelete: false,
    modExpensesAdd: false, modExpensesEdit: false, modExpensesDelete: false,
    canViewReports: false,
    canManageStudents: false,
  });

  const openApproveDialog = (request: JoinRequest) => {
    setApproveDialog(defaultApproveData(request, "moderator"));
  };

  const openAcceptRejectedDialog = (request: JoinRequest) => {
    setAcceptRejectedDialog(defaultApproveData(request, "moderator"));
  };

  const handleRoleChange = (
    newRole: ApprovalRole,
    current: ApproveData,
    setter: (d: ApproveData) => void,
  ) => {
    setter({ ...defaultApproveData(current.request, newRole), email: current.email });
  };

  // ── Role Selector ──
  const RoleSelector = ({
    data,
    onRoleChange,
  }: {
    data: ApproveData;
    onRoleChange: (role: ApprovalRole) => void;
  }) => (
    <div className="space-y-1.5 py-2">
      <Label>Role</Label>
      <Select value={data.role} onValueChange={(v) => onRoleChange(v as ApprovalRole)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Admin
            </div>
          </SelectItem>
          <SelectItem value="moderator">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Moderator
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  // ── Permission Toggles ──
  const PermissionToggles = ({
    data,
    onChange,
  }: {
    data: ApproveData;
    onChange: (updated: ApproveData) => void;
  }) => {
    if (data.role === "admin") {
      return (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-foreground">Full company access — can manage everything except platform settings.</p>
        </div>
      );
    }

    // Moderator role
    return (
      <div className="space-y-4">
        {/* Data Entry Mode Toggle */}
        <div className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Data Entry Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable data entry restrictions — moderator can only add records and view their own entries
              </p>
            </div>
            <Switch
              checked={data.dataEntryMode}
              onCheckedChange={(c) => onChange({
                ...defaultApproveData(data.request, "moderator"),
                email: data.email,
                dataEntryMode: c,
              })}
            />
          </div>
        </div>

        {data.dataEntryMode ? (
          /* DEO simplified permissions */
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Will only see their own entries, no financial aggregate access</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "deoStudents", label: "Can Add Students" },
                { key: "deoExpenses", label: "Can Add Expenses" },
              ] as const).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={data[key]}
                    onCheckedChange={(c) => onChange({ ...data, [key]: !!c })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ) : (
          /* Full moderator granular permissions */
          <div className="space-y-4">
            {([
              { title: "Students", keys: ["modStudentsAdd", "modStudentsEdit", "modStudentsDelete"] },
              { title: "Payments", keys: ["modPaymentsAdd", "modPaymentsEdit", "modPaymentsDelete"] },
              { title: "Batches", keys: ["modBatchesAdd", "modBatchesEdit", "modBatchesDelete"] },
              
              { title: "Revenue", keys: ["modRevenueAdd", "modRevenueEdit", "modRevenueDelete"] },
              { title: "Expenses", keys: ["modExpensesAdd", "modExpensesEdit", "modExpensesDelete"] },
            ] as const).map(({ title, keys }) => (
              <div key={title} className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <div className="flex gap-4">
                  {(["Add", "Edit", "Delete"] as const).map((action, i) => (
                    <label key={action} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={data[keys[i] as keyof ApproveData] as boolean}
                        onCheckedChange={(c) => onChange({ ...data, [keys[i]]: !!c })}
                      />
                      {action}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={data.canViewReports}
                  onCheckedChange={(c) => onChange({ ...data, canViewReports: !!c })}
                />
                Can View Reports
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={data.canManageStudents}
                  onCheckedChange={(c) => onChange({ ...data, canManageStudents: !!c })}
                />
                Can Manage Members
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Summary Card ──
  const SummaryCard = ({ data }: { data: ApproveData }) => (
    <div className="rounded-md border border-border bg-muted/50 p-3 text-sm space-y-1">
      <p className="font-medium text-foreground">Summary</p>
      <p className="text-muted-foreground">
        <strong>{data.email}</strong> will be added as <strong>{roleLabel(data.role, data.dataEntryMode)}</strong>
      </p>
      <p className="text-muted-foreground">
        Permissions: {buildPermissionsSummary(data)}
      </p>
    </div>
  );

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
          className="max-h-[85vh] overflow-y-auto"
          onInteractOutside={(e) => { if (approveMutation.isPending) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (approveMutation.isPending) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
            <DialogDescription>
              Configure role and permissions for <span className="font-medium">{approveDialog?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          {approveDialog && (
            <>
              <RoleSelector data={approveDialog} onRoleChange={(r) => handleRoleChange(r, approveDialog, setApproveDialog)} />
              <PermissionToggles data={approveDialog} onChange={setApproveDialog} />
              <SummaryCard data={approveDialog} />
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
          className="max-h-[85vh] overflow-y-auto"
          onInteractOutside={(e) => { if (acceptRejectedMutation.isPending) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (acceptRejectedMutation.isPending) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Accept Rejected User</DialogTitle>
            <DialogDescription>
              Re-accept <span className="font-medium">{acceptRejectedDialog?.email}</span>. The ban will be lifted.
            </DialogDescription>
          </DialogHeader>
          {acceptRejectedDialog && (
            <>
              <RoleSelector data={acceptRejectedDialog} onRoleChange={(r) => handleRoleChange(r, acceptRejectedDialog, setAcceptRejectedDialog)} />
              <PermissionToggles data={acceptRejectedDialog} onChange={setAcceptRejectedDialog} />
              <SummaryCard data={acceptRejectedDialog} />
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
