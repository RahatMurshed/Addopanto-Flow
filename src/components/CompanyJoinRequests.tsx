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
import { SkeletonTable } from "@/components/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";

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
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canAddExpenseSource: boolean;
  canTransfer: boolean;
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
        .select("user_id, email")
        .in("user_id", userIds);
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });

  const getEmail = (userId: string) =>
    requestProfiles.find((p) => p.user_id === userId)?.email || userId.slice(0, 8) + "...";

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

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (data: ApproveData) => {
      return invokeJoinAction({
        action: "approve-join-request",
        requestId: data.request.id,
        companyId: activeCompanyId,
        permissions: {
          can_add_revenue: data.canAddRevenue,
          can_add_expense: data.canAddExpense,
          can_add_expense_source: data.canAddExpenseSource,
          can_transfer: data.canTransfer,
          can_view_reports: data.canViewReports,
          can_manage_students: data.canManageStudents,
        },
      });
    },
    onSuccess: () => {
      toast({ title: "Join request approved", description: "User has been added to the company as a Moderator." });
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
        permissions: {
          can_add_revenue: data.canAddRevenue,
          can_add_expense: data.canAddExpense,
          can_add_expense_source: data.canAddExpenseSource,
          can_transfer: data.canTransfer,
          can_view_reports: data.canViewReports,
          can_manage_students: data.canManageStudents,
        },
      });
    },
    onSuccess: () => {
      toast({ title: "User accepted", description: "Rejected user has been added to the company." });
      queryClient.invalidateQueries({ queryKey: ["company-join-requests-admin", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      setAcceptRejectedDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept", description: error.message, variant: "destructive" });
    },
  });

  const openApproveDialog = (request: JoinRequest) => {
    setApproveDialog({
      request,
      email: getEmail(request.user_id),
      canAddRevenue: false,
      canAddExpense: false,
      canAddExpenseSource: false,
      canTransfer: false,
      canViewReports: false,
      canManageStudents: false,
    });
  };

  const openAcceptRejectedDialog = (request: JoinRequest) => {
    setAcceptRejectedDialog({
      request,
      email: getEmail(request.user_id),
      canAddRevenue: true,
      canAddExpense: true,
      canAddExpenseSource: false,
      canTransfer: false,
      canViewReports: true,
      canManageStudents: false,
    });
  };

  const PermissionToggles = ({
    data,
    onChange,
  }: {
    data: ApproveData;
    onChange: (updated: ApproveData) => void;
  }) => (
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

  if (!activeCompanyId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select a company to view join requests.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Company Join Requests</CardTitle>
          <CardDescription>
            Review join requests for <span className="font-medium">{activeCompany?.name}</span>. Approved users will be added as Moderators with configurable permissions.
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
                          <TableCell className="font-medium">{getEmail(request.user_id)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {request.message || "—"}
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
                            <TableCell className="font-medium">{getEmail(request.user_id)}</TableCell>
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
              Configure permissions for <span className="font-medium">{approveDialog?.email}</span>. They will be added as a Moderator.
            </DialogDescription>
          </DialogHeader>
          {approveDialog && <PermissionToggles data={approveDialog} onChange={setApproveDialog} />}
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
              Re-accept <span className="font-medium">{acceptRejectedDialog?.email}</span> and add them as a Moderator. The ban will be lifted.
            </DialogDescription>
          </DialogHeader>
          {acceptRejectedDialog && <PermissionToggles data={acceptRejectedDialog} onChange={setAcceptRejectedDialog} />}
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
