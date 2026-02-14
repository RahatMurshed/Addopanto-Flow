import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Navigate } from "react-router-dom";
import { RoleGuard } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, Loader2, UserPlus, Clock, CheckCircle, XCircle, Wallet, ArrowLeftRight, Trash2 } from "lucide-react";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";

interface RegistrationRequest {
  id: string;
  user_id: string;
  email: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  banned_until: string | null;
  can_add_revenue: boolean;
  can_add_expense: boolean;
  can_add_expense_source: boolean;
  can_transfer: boolean;
  can_view_reports: boolean;
}

interface ApproveDialogData {
  request: RegistrationRequest;
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canAddExpenseSource: boolean;
  canTransfer: boolean;
  canViewReports: boolean;
}

export default function RegistrationRequests() {
  const { session } = useAuth();
  const { isCipher } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveDialog, setApproveDialog] = useState<ApproveDialogData | null>(null);
  const [rejectDialog, setRejectDialog] = useState<RegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<RegistrationRequest | null>(null);
  const [acceptFromRejectedDialog, setAcceptFromRejectedDialog] = useState<ApproveDialogData | null>(null);

  // Fetch registration requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["registration-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registration_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data as RegistrationRequest[];
    },
  });

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const rejectedRequests = requests.filter((r) => r.status === "rejected");

  const invokeAdminAction = async (body: Record<string, unknown>) => {
    const { data: result, error } = await supabase.functions.invoke("admin-users", {
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
    mutationFn: async (data: ApproveDialogData) => {
      return invokeAdminAction({
        action: "approve",
        userId: data.request.user_id,
        permissions: {
          can_add_revenue: data.canAddRevenue,
          can_add_expense: data.canAddExpense,
          can_add_expense_source: data.canAddExpenseSource,
          can_transfer: data.canTransfer,
          can_view_reports: data.canViewReports,
        },
      });
    },
    onSuccess: () => {
      toast({ title: "User approved", description: "The user has been granted access as a Moderator." });
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
      setApproveDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (request: RegistrationRequest) => {
      return invokeAdminAction({
        action: "reject",
        userId: request.user_id,
        reason: rejectionReason || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "User rejected", description: "The user has been rejected and banned for 1 day." });
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
      setRejectDialog(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    },
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (request: RegistrationRequest) => {
      return invokeAdminAction({
        action: "permanent-delete",
        userId: request.user_id,
      });
    },
    onSuccess: () => {
      toast({ title: "User permanently deleted", description: "The user has been deleted and banned for 7 days." });
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
      setDeleteDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  // Accept from rejected mutation
  const acceptFromRejectedMutation = useMutation({
    mutationFn: async (data: ApproveDialogData) => {
      return invokeAdminAction({
        action: "accept-rejected",
        userId: data.request.user_id,
        permissions: {
          can_add_revenue: data.canAddRevenue,
          can_add_expense: data.canAddExpense,
          can_add_expense_source: data.canAddExpenseSource,
          can_transfer: data.canTransfer,
          can_view_reports: data.canViewReports,
        },
      });
    },
    onSuccess: () => {
      toast({ title: "User accepted", description: "The rejected user has been granted Moderator access." });
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
      setAcceptFromRejectedDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept", description: error.message, variant: "destructive" });
    },
  });

  const openApproveDialog = (request: RegistrationRequest) => {
    setApproveDialog({
      request,
      canAddRevenue: request.can_add_revenue,
      canAddExpense: request.can_add_expense,
      canAddExpenseSource: request.can_add_expense_source,
      canTransfer: request.can_transfer,
      canViewReports: request.can_view_reports,
    });
  };

  const openAcceptFromRejectedDialog = (request: RegistrationRequest) => {
    setAcceptFromRejectedDialog({
      request,
      canAddRevenue: true,
      canAddExpense: true,
      canAddExpenseSource: false,
      canTransfer: false,
      canViewReports: true,
    });
  };

  const PermissionToggles = ({ 
    data, 
    onChange 
  }: { 
    data: ApproveDialogData; 
    onChange: (updated: ApproveDialogData) => void;
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
    </div>
  );

  const PendingTable = ({ items }: { items: RegistrationRequest[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No requests found</TableCell>
          </TableRow>
        ) : (
          items.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.email}</TableCell>
              <TableCell>{format(new Date(request.requested_at), "MMM d, yyyy h:mm a")}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400" onClick={() => openApproveDialog(request)}>
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => setRejectDialog(request)}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const HistoryTable = ({ items }: { items: RegistrationRequest[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Reviewed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No requests found</TableCell>
          </TableRow>
        ) : (
          items.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.email}</TableCell>
              <TableCell>{format(new Date(request.requested_at), "MMM d, yyyy h:mm a")}</TableCell>
              <TableCell>{request.reviewed_at ? format(new Date(request.reviewed_at), "MMM d, yyyy h:mm a") : "-"}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const RejectedTable = ({ items }: { items: RegistrationRequest[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Rejected</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No rejected requests</TableCell>
          </TableRow>
        ) : (
          items.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.email}</TableCell>
              <TableCell>{request.reviewed_at ? format(new Date(request.reviewed_at), "MMM d, yyyy h:mm a") : "-"}</TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">{request.rejection_reason || "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400" onClick={() => openAcceptFromRejectedDialog(request)}>
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog(request)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );


  if (!isCipher) {
    return <Navigate to="/" replace />;
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registration Requests</h1>
            <p className="text-muted-foreground">Approve or reject new user registrations</p>
          </div>
          {pendingRequests.length > 0 && (
            <Badge variant="secondary" className="gap-1 px-3 py-1">
              <UserPlus className="h-4 w-4" />
              {pendingRequests.length} pending
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registration Requests</CardTitle>
            <CardDescription>
              Review registration requests from new users. Approved users will be granted Moderator access with configurable permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-28 rounded-md" />
                  <Skeleton className="h-9 w-28 rounded-md" />
                  <Skeleton className="h-9 w-28 rounded-md" />
                </div>
                <SkeletonTable rows={4} columns={3} />
              </div>
            ) : (
              <Tabs defaultValue="pending">
                <TabsList>
                  <TabsTrigger value="pending" className="gap-2">
                    <Clock className="h-4 w-4" />
                    Pending ({pendingRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Approved ({approvedRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Rejected ({rejectedRequests.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4">
                  <PendingTable items={pendingRequests} />
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
                  <HistoryTable items={approvedRequests} />
                </TabsContent>
                <TabsContent value="rejected" className="mt-4">
                  <RejectedTable items={rejectedRequests} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Approve Dialog (for pending) */}
        <Dialog open={!!approveDialog} onOpenChange={(open) => { if (!open && !approveMutation.isPending) setApproveDialog(null); }}>
          <DialogContent onInteractOutside={(e) => { if (approveMutation.isPending) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (approveMutation.isPending) e.preventDefault(); }}>
            <DialogHeader>
              <DialogTitle>Approve Registration</DialogTitle>
              <DialogDescription>
                Configure permissions for <span className="font-medium">{approveDialog?.request.email}</span>. They will be granted Moderator access.
              </DialogDescription>
            </DialogHeader>
            {approveDialog && <PermissionToggles data={approveDialog} onChange={setApproveDialog} />}
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialog(null)} disabled={approveMutation.isPending}>Cancel</Button>
              <Button onClick={() => approveDialog && approveMutation.mutate(approveDialog)} disabled={approveMutation.isPending} className="gap-2">
                {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {approveMutation.isPending ? "Approving..." : "Approve & Grant Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Accept from Rejected Dialog */}
        <Dialog open={!!acceptFromRejectedDialog} onOpenChange={(open) => { if (!open && !acceptFromRejectedMutation.isPending) setAcceptFromRejectedDialog(null); }}>
          <DialogContent onInteractOutside={(e) => { if (acceptFromRejectedMutation.isPending) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (acceptFromRejectedMutation.isPending) e.preventDefault(); }}>
            <DialogHeader>
              <DialogTitle>Accept Rejected User</DialogTitle>
              <DialogDescription>
                Re-accept <span className="font-medium">{acceptFromRejectedDialog?.request.email}</span> and grant Moderator access. The ban will be lifted immediately.
              </DialogDescription>
            </DialogHeader>
            {acceptFromRejectedDialog && <PermissionToggles data={acceptFromRejectedDialog} onChange={setAcceptFromRejectedDialog} />}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAcceptFromRejectedDialog(null)} disabled={acceptFromRejectedMutation.isPending}>Cancel</Button>
              <Button onClick={() => acceptFromRejectedDialog && acceptFromRejectedMutation.mutate(acceptFromRejectedDialog)} disabled={acceptFromRejectedMutation.isPending} className="gap-2">
                {acceptFromRejectedMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {acceptFromRejectedMutation.isPending ? "Accepting..." : "Accept & Grant Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <AlertDialog open={!!rejectDialog} onOpenChange={(open) => { if (!open && !rejectMutation.isPending) setRejectDialog(null); }}>
          <AlertDialogContent onEscapeKeyDown={(e) => { if (rejectMutation.isPending) e.preventDefault(); }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Registration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject <span className="font-medium">{rejectDialog?.email}</span>? 
                They will be banned from logging in or signing up for 1 day.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="rejection-reason">Reason (optional)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                disabled={rejectMutation.isPending}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRejectionReason("")} disabled={rejectMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); rejectDialog && rejectMutation.mutate(rejectDialog); }}
                disabled={rejectMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {rejectMutation.isPending ? "Rejecting..." : "Reject (1-day ban)"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanent Delete Dialog */}
        <AlertDialog open={!!deleteDialog} onOpenChange={(open) => { if (!open && !permanentDeleteMutation.isPending) setDeleteDialog(null); }}>
          <AlertDialogContent onEscapeKeyDown={(e) => { if (permanentDeleteMutation.isPending) e.preventDefault(); }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <span className="font-medium">{deleteDialog?.email}</span>? 
                The account will be removed and they can send a sign up request again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={permanentDeleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); deleteDialog && permanentDeleteMutation.mutate(deleteDialog); }}
                disabled={permanentDeleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                {permanentDeleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {permanentDeleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
