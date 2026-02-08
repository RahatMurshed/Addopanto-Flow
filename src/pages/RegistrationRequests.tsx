import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Check, X, Loader2, UserPlus, Clock, CheckCircle, XCircle } from "lucide-react";

interface RegistrationRequest {
  id: string;
  user_id: string;
  email: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  can_add_revenue: boolean;
  can_add_expense: boolean;
  can_view_reports: boolean;
}

interface ApproveDialogData {
  request: RegistrationRequest;
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canViewReports: boolean;
}

export default function RegistrationRequests() {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveDialog, setApproveDialog] = useState<ApproveDialogData | null>(null);
  const [rejectDialog, setRejectDialog] = useState<RegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (data: ApproveDialogData) => {
      const { data: result, error } = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: {
          action: "approve",
          userId: data.request.user_id,
          permissions: {
            can_add_revenue: data.canAddRevenue,
            can_add_expense: data.canAddExpense,
            can_view_reports: data.canViewReports,
          },
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
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
      const { data: result, error } = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: {
          action: "reject",
          userId: request.user_id,
          reason: rejectionReason || undefined,
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "User rejected", description: "The registration request has been rejected and the user has been removed." });
      queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
      setRejectDialog(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    },
  });

  const openApproveDialog = (request: RegistrationRequest) => {
    setApproveDialog({
      request,
      canAddRevenue: request.can_add_revenue,
      canAddExpense: request.can_add_expense,
      canViewReports: request.can_view_reports,
    });
  };

  const RequestsTable = ({ items, showActions }: { items: RegistrationRequest[]; showActions: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Requested</TableHead>
          {!showActions && <TableHead>Reviewed</TableHead>}
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 3 : 3} className="text-center text-muted-foreground py-8">
              No requests found
            </TableCell>
          </TableRow>
        ) : (
          items.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.email}</TableCell>
              <TableCell>{format(new Date(request.requested_at), "MMM d, yyyy h:mm a")}</TableCell>
              {!showActions && (
                <TableCell>
                  {request.reviewed_at
                    ? format(new Date(request.reviewed_at), "MMM d, yyyy h:mm a")
                    : "-"}
                </TableCell>
              )}
              {showActions && (
              <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                      onClick={() => openApproveDialog(request)}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:bg-destructive/10"
                      onClick={() => setRejectDialog(request)}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <RoleGuard roles={["admin", "cipher"]}>
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
            <CardTitle>Requests</CardTitle>
            <CardDescription>
              Review registration requests from new users. Approved users will be granted Moderator access with configurable permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                  <RequestsTable items={pendingRequests} showActions={true} />
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
                  <RequestsTable items={approvedRequests} showActions={false} />
                </TabsContent>
                <TabsContent value="rejected" className="mt-4">
                  <RequestsTable items={rejectedRequests} showActions={false} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Approve Dialog */}
        <Dialog open={!!approveDialog} onOpenChange={(open) => !open && setApproveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Registration</DialogTitle>
              <DialogDescription>
                Configure permissions for <span className="font-medium">{approveDialog?.request.email}</span>. 
                They will be granted Moderator access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="can-add-revenue">Can Add Revenue</Label>
                <Switch
                  id="can-add-revenue"
                  checked={approveDialog?.canAddRevenue ?? true}
                  onCheckedChange={(checked) =>
                    approveDialog && setApproveDialog({ ...approveDialog, canAddRevenue: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="can-add-expense">Can Add Expense</Label>
                <Switch
                  id="can-add-expense"
                  checked={approveDialog?.canAddExpense ?? true}
                  onCheckedChange={(checked) =>
                    approveDialog && setApproveDialog({ ...approveDialog, canAddExpense: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="can-view-reports">Can View Reports</Label>
                <Switch
                  id="can-view-reports"
                  checked={approveDialog?.canViewReports ?? true}
                  onCheckedChange={(checked) =>
                    approveDialog && setApproveDialog({ ...approveDialog, canViewReports: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => approveDialog && approveMutation.mutate(approveDialog)}
                disabled={approveMutation.isPending}
                className="gap-2"
              >
                {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve & Grant Access
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <AlertDialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Registration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject <span className="font-medium">{rejectDialog?.email}</span>? 
                This will permanently delete their account.
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
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => rejectDialog && rejectMutation.mutate(rejectDialog)}
                disabled={rejectMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Reject & Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
