import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, Loader2, Building2, Clock, Eye, Users } from "lucide-react";
import { SkeletonTable } from "@/components/shared/SkeletonLoaders";
import { UserAvatar } from "@/components/auth/UserAvatar";

interface CreationRequest {
  id: string;
  user_id: string;
  company_name: string;
  company_slug: string;
  description: string | null;
  logo_url: string | null;
  industry: string | null;
  estimated_students: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  reason: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export default function CompanyCreationRequests() {
  const { session } = useAuth();
  const { isCipher } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewRequest, setViewRequest] = useState<CreationRequest | null>(null);
  const [rejectDialog, setRejectDialog] = useState<CreationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveDialog, setApproveDialog] = useState<CreationRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["company-creation-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_creation_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CreationRequest[];
    },
  });

  // Fetch user profiles for requesters
  const userIds = [...new Set(requests.map(r => r.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["requester-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, avatar_url, email")
        .in("user_id", userIds);
      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map(profiles.map(p => [p.user_id, p]));

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  const approveMutation = useMutation({
    mutationFn: async (request: CreationRequest) => {
      const { data, error } = await supabase.functions.invoke("company-join", {
        body: {
          action: "approve-company-creation",
          requestId: request.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Company created!", description: "The company has been created and the user assigned as admin." });
      queryClient.invalidateQueries({ queryKey: ["company-creation-requests"] });
      setApproveDialog(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (request: CreationRequest) => {
      const { data, error } = await supabase.functions.invoke("company-join", {
        body: {
          action: "reject-company-creation",
          requestId: request.id,
          reason: rejectionReason || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Request rejected" });
      queryClient.invalidateQueries({ queryKey: ["company-creation-requests"] });
      setRejectDialog(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    },
  });

  if (!isCipher) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Creation Requests</h1>
          <p className="text-muted-foreground">Review and approve requests to create new companies</p>
        </div>
        {pendingRequests.length > 0 && (
          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <Building2 className="h-4 w-4" />
            {pendingRequests.length} pending
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>These users are requesting to create a new company</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={3} columns={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No pending requests</TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.map((req) => {
                    const profile = profileMap.get(req.user_id);
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar fullName={profile?.full_name} avatarUrl={profile?.avatar_url} size="sm" />
                            <div>
                              <p className="font-medium text-sm">{profile?.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{profile?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{req.company_name}</TableCell>
                        <TableCell className="text-muted-foreground">{req.industry || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(req.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setViewRequest(req)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-emerald-600 hover:bg-emerald-500/10" onClick={() => setApproveDialog(req)}>
                              <Check className="h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => setRejectDialog(req)}>
                              <X className="h-4 w-4" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((req) => {
                  const profile = profileMap.get(req.user_id);
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar fullName={profile?.full_name} avatarUrl={profile?.avatar_url} size="sm" />
                          <span className="text-sm">{profile?.full_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{req.company_name}</TableCell>
                      <TableCell>
                        <Badge variant={req.status === "approved" ? "default" : "destructive"}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {req.reviewed_at ? format(new Date(req.reviewed_at), "MMM d, yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewRequest} onOpenChange={(open) => !open && setViewRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>Company creation request from {profileMap.get(viewRequest?.user_id || "")?.full_name || "Unknown"}</DialogDescription>
          </DialogHeader>
          {viewRequest && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Company Name:</span><p className="font-medium">{viewRequest.company_name}</p></div>
                <div><span className="text-muted-foreground">Slug:</span><p className="font-medium">{viewRequest.company_slug}</p></div>
                <div><span className="text-muted-foreground">Industry:</span><p>{viewRequest.industry || "-"}</p></div>
                <div><span className="text-muted-foreground">Est. Students:</span><p>{viewRequest.estimated_students ?? "-"}</p></div>
                <div><span className="text-muted-foreground">Contact Email:</span><p>{viewRequest.contact_email || "-"}</p></div>
                <div><span className="text-muted-foreground">Contact Phone:</span><p>{viewRequest.contact_phone || "-"}</p></div>
              </div>
              {viewRequest.description && (
                <div><span className="text-muted-foreground">Description:</span><p className="mt-1">{viewRequest.description}</p></div>
              )}
              {viewRequest.reason && (
                <div><span className="text-muted-foreground">Reason:</span><p className="mt-1">{viewRequest.reason}</p></div>
              )}
              {viewRequest.logo_url && (
                <div><span className="text-muted-foreground">Logo:</span><img src={viewRequest.logo_url} alt="Logo" className="mt-1 h-16 w-16 rounded-lg object-cover" /></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      <AlertDialog open={!!approveDialog} onOpenChange={(open) => !open && setApproveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Company Creation</AlertDialogTitle>
            <AlertDialogDescription>
              This will create the company "<span className="font-medium">{approveDialog?.company_name}</span>" and assign the requesting user as admin with full permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => approveDialog && approveMutation.mutate(approveDialog)} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open && !rejectMutation.isPending) { setRejectDialog(null); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Reject the company creation request for "{rejectDialog?.company_name}"</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectionReason(""); }} disabled={rejectMutation.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectDialog && rejectMutation.mutate(rejectDialog)} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
