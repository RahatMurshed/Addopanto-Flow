import { useEffect, useState, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, UserPlus, LogOut, Loader2, Users, ChevronRight, Clock, XCircle, X, Sparkles, RefreshCw } from "lucide-react";
import gaLogo from "@/assets/GA-LOGO.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function CompanySelection() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companies, memberships, switchCompany, isCipher, isLoading } = useCompany();
  const [dismissedRejections, setDismissedRejections] = useState<string[]>([]);
  const [dismissedCreationRejections, setDismissedCreationRejections] = useState<string[]>([]);
  const [newlyJoinedIds, setNewlyJoinedIds] = useState<string[]>([]);
  const prevCreationStatusesRef = useRef<Record<string, string>>({});

  // Fetch cipher user IDs for member count filtering (uses security definer function)
  const { data: cipherUserIds = [] } = useQuery({
    queryKey: ["cipher-user-ids-for-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cipher_user_ids");
      if (error) throw error;
      return (data as string[]) ?? [];
    },
    enabled: !isCipher && companies.length > 0,
  });

  // Get member counts for each company
  const { data: memberCounts = {} } = useQuery({
    queryKey: ["company-member-counts", companies.map(c => c.id), cipherUserIds],
    queryFn: async () => {
      if (companies.length === 0) return {};
      const companyIds = companies.map(c => c.id);
      const { data, error } = await supabase
        .from("company_memberships")
        .select("company_id, user_id")
        .in("company_id", companyIds)
        .eq("status", "active");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (!isCipher && cipherUserIds.includes(row.user_id)) continue;
        counts[row.company_id] = (counts[row.company_id] || 0) + 1;
      }
      return counts;
    },
    enabled: companies.length > 0,
  });

  // Fetch user's pending company creation requests
  const { data: pendingCreationRequests = [] } = useQuery({
    queryKey: ["my-creation-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_creation_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's rejected company creation requests
  const { data: rejectedCreationRequests = [] } = useQuery({
    queryKey: ["my-rejected-creation-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_creation_requests")
        .select("*")
        .eq("status", "rejected")
        .order("reviewed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's pending join requests with company info
  const { data: pendingJoinRequests = [] } = useQuery({
    queryKey: ["my-pending-join-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("company_join_requests")
        .select("id, company_id, requested_at, status")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's rejected join requests
  const { data: rejectedJoinRequests = [] } = useQuery({
    queryKey: ["my-rejected-join-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("company_join_requests")
        .select("id, company_id, requested_at, reviewed_at, rejection_reason, status")
        .eq("user_id", user.id)
        .eq("status", "rejected")
        .order("reviewed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch company names for pending/rejected requests
  const requestCompanyIds = [
    ...pendingJoinRequests.map(r => r.company_id),
    ...rejectedJoinRequests.map(r => r.company_id),
  ];
  const { data: requestCompanyNames = {} } = useQuery({
    queryKey: ["request-company-names", requestCompanyIds],
    queryFn: async () => {
      if (requestCompanyIds.length === 0) return {};
      const { data, error } = await (supabase
        .from("companies_public" as any)
        .select("id, name")
        .in("id", requestCompanyIds) as any);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const c of data ?? []) map[c.id] = c.name;
      return map;
    },
    enabled: requestCompanyIds.length > 0,
  });

  // Poll for pending join request approvals every 7 seconds
  useEffect(() => {
    if (!user?.id || pendingJoinRequests.length === 0) return;
    const knownCompanyIds = companies.map(c => c.id);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("company_memberships")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      const currentIds = data?.map(m => m.company_id) ?? [];
      const newIds = currentIds.filter(id => !knownCompanyIds.includes(id));
      if (newIds.length > 0) {
        setNewlyJoinedIds(prev => [...new Set([...prev, ...newIds])]);
        const companyName = requestCompanyNames[newIds[0]] || "business";
        queryClient.invalidateQueries({ queryKey: ["company-memberships"] });
        queryClient.invalidateQueries({ queryKey: ["user-companies"] });
        queryClient.invalidateQueries({ queryKey: ["my-pending-join-requests"] });
        toast({
          title: "🎉 You've been approved!",
          description: `You've been added to ${companyName}!`,
        });
        navigate("/companies", { replace: true });
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [user?.id, pendingJoinRequests.length, companies, requestCompanyNames, queryClient, toast, navigate]);

  // Poll for pending creation request status changes every 7 seconds
  useEffect(() => {
    if (!user?.id || pendingCreationRequests.length === 0) return;

    // Track known statuses
    const currentStatuses: Record<string, string> = {};
    pendingCreationRequests.forEach(r => { currentStatuses[r.id] = r.status; });
    prevCreationStatusesRef.current = currentStatuses;

    const interval = setInterval(async () => {
      const pendingIds = pendingCreationRequests.map(r => r.id);
      const { data, error } = await supabase
        .from("company_creation_requests")
        .select("id, status, company_name")
        .in("id", pendingIds);
      if (error || !data) return;

      for (const req of data) {
        const prev = prevCreationStatusesRef.current[req.id];
        if (prev === "pending" && req.status === "approved") {
          toast({
            title: "🎉 Business Created!",
            description: `Your business "${req.company_name}" has been approved!`,
          });
          queryClient.invalidateQueries({ queryKey: ["company-memberships"] });
          queryClient.invalidateQueries({ queryKey: ["user-companies"] });
          queryClient.invalidateQueries({ queryKey: ["my-creation-requests"] });
          navigate("/companies", { replace: true });
        } else if (prev === "pending" && req.status === "rejected") {
          toast({
            title: "Request Rejected",
            description: `Your request for "${req.company_name}" was rejected.`,
            variant: "destructive",
          });
          queryClient.invalidateQueries({ queryKey: ["my-creation-requests"] });
          queryClient.invalidateQueries({ queryKey: ["my-rejected-creation-requests"] });
        }
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [user?.id, pendingCreationRequests, queryClient, toast, navigate]);

  // Auto-redirect to join page when user has no companies and no pending/rejected requests
  useEffect(() => {
    if (isLoading) return;
    if (
      companies.length === 0 &&
      !isCipher &&
      pendingJoinRequests.length === 0 &&
      rejectedJoinRequests.length === 0 &&
      pendingCreationRequests.length === 0 &&
      rejectedCreationRequests.length === 0 &&
      newlyJoinedIds.length === 0
    ) {
      navigate("/companies/join", { replace: true });
    }
  }, [companies.length, isCipher, isLoading, navigate, pendingJoinRequests.length, rejectedJoinRequests.length, pendingCreationRequests.length, rejectedCreationRequests.length, newlyJoinedIds.length]);

  const handleSelectCompany = async (companyId: string) => {
    await switchCompany(companyId);
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleDismissRejection = (requestId: string) => {
    setDismissedRejections(prev => [...prev, requestId]);
  };

  const handleDismissCreationRejection = (requestId: string) => {
    setDismissedCreationRejections(prev => [...prev, requestId]);
  };

  const visibleRejections = rejectedJoinRequests.filter(r => !dismissedRejections.includes(r.id));
  const visibleCreationRejections = rejectedCreationRequests.filter(r => !dismissedCreationRejections.includes(r.id));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRoleBadge = (companyId: string) => {
    const m = memberships.find(mb => mb.company_id === companyId);
    if (!m) return null;
    const colors: Record<string, string> = {
      admin: "bg-primary/15 text-primary border-primary/30",
      moderator: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
      viewer: "bg-muted text-muted-foreground",
    };
    return <Badge className={colors[m.role] || ""}>{m.role}</Badge>;
  };

  // Show encouraging empty state when only rejected requests exist
  const hasOnlyRejections = companies.length === 0 && !isCipher &&
    pendingJoinRequests.length === 0 && pendingCreationRequests.length === 0 &&
    (visibleRejections.length > 0 || visibleCreationRejections.length > 0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link to="/"><img src={gaLogo} alt="Grammar Addopanto" className="mx-auto h-14 w-auto object-contain" /></Link>
          <h1 className="text-2xl font-bold">Select a Business</h1>
          <p className="text-muted-foreground">Choose a business to continue</p>
        </div>

        {/* Rejected creation requests */}
        {visibleCreationRejections.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Rejected Business Requests
            </h2>
            {visibleCreationRejections.map((req) => (
              <Card key={req.id} className="border-destructive/30 bg-destructive/5">
                <CardContent className="flex items-start gap-3 py-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Your request to create <span className="text-primary font-semibold">"{req.company_name}"</span> was rejected
                    </p>
                    {req.reviewed_at && (
                      <p className="text-xs text-muted-foreground">
                        Rejected on {new Date(req.reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                    {req.rejection_reason && (
                      <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-destructive/30 pl-2">
                        Reason: {req.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="destructive" className="text-xs">Rejected</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDismissCreationRejection(req.id)}
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate("/companies/create")}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Submit New Request
            </Button>
          </div>
        )}

        {/* Rejected join requests */}
        {visibleRejections.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Rejected Join Requests
            </h2>
            {visibleRejections.map((req) => (
              <Card key={req.id} className="border-destructive/30 bg-destructive/5">
                <CardContent className="flex items-start gap-3 py-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Your request to join <span className="text-primary">{requestCompanyNames[req.company_id] || "Unknown"}</span> was rejected
                    </p>
                    {req.reviewed_at && (
                      <p className="text-xs text-muted-foreground">
                        Rejected on {new Date(req.reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                    {req.rejection_reason && (
                      <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-destructive/30 pl-2">
                        Reason: {req.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="destructive" className="text-xs">Rejected</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDismissRejection(req.id)}
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate("/companies/join")}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Try Another Business
            </Button>
          </div>
        )}

        {/* Pending creation requests with pulsing indicator */}
        {pendingCreationRequests.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pending Business Creation
            </h2>
            {pendingCreationRequests.map((req) => (
              <Card key={req.id} className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="relative shrink-0">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Business creation request: <span className="text-primary font-semibold">"{req.company_name}"</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(req.created_at).toLocaleDateString()} — Awaiting review
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                    Pending
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pending join requests */}
        {pendingJoinRequests.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pending Join Requests
            </h2>
            {pendingJoinRequests.map((req) => (
              <Card key={req.id} className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="relative shrink-0">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Request to join <span className="text-primary">{requestCompanyNames[req.company_id] || "Unknown"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(req.requested_at).toLocaleDateString()} — Awaiting admin approval
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                    Pending
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Encouraging empty state */}
        {hasOnlyRejections && (
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="text-center py-6 space-y-3">
              <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-sm font-medium text-foreground">Don't worry — you can try again!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submit a new business creation request or join an existing business.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" onClick={() => navigate("/companies/create")}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Request New Business
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/companies/join")}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Join Business
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Companies */}
        {companies.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" /> My Businesses
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {companies.map((company) => (
                <Card
                  key={company.id}
                  className={`group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${newlyJoinedIds.includes(company.id) ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
                  onClick={() => handleSelectCompany(company.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.name} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {company.name}
                            {newlyJoinedIds.includes(company.id) && (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] py-0 px-1.5 gap-0.5">
                                <Sparkles className="h-3 w-3" /> New
                              </Badge>
                            )}
                          </CardTitle>
                          {company.description && (
                            <CardDescription className="text-xs line-clamp-1">{company.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0">
                    {getRoleBadge(company.id)}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {memberCounts[company.id] ?? 0} members
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => navigate("/companies/join")}>
            <UserPlus className="mr-2 h-4 w-4" /> Join Business
          </Button>
          <Button variant={isCipher ? "default" : "outline"} onClick={() => navigate("/companies/create")}>
            <Plus className="mr-2 h-4 w-4" /> {isCipher ? "Create Business" : "Request New Business"}
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
