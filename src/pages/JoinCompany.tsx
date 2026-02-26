import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Loader2, Search, KeyRound, Ticket, Eye, EyeOff, ShieldCheck, XCircle, AlertCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/contexts/CompanyContext";
import gaLogo from "@/assets/GA-LOGO.png";

export default function JoinCompany() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isCipher } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [joiningCompanyId, setJoiningCompanyId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { data: allCompanies = [] } = useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("browse_companies_safe");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; slug: string; description: string | null; logo_url: string | null }>;
    },
  });

  const { data: existingMemberships = [] } = useQuery({
    queryKey: ["my-memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("company_memberships")
        .select("company_id")
        .eq("user_id", user.id);
      return data?.map(m => m.company_id) ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["my-join-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("company_join_requests")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "pending");
      return data?.map(r => r.company_id) ?? [];
    },
    enabled: !!user?.id,
  });

  // Fetch pending requests with details for the visual section
  const { data: pendingRequestDetails = [] } = useQuery({
    queryKey: ["my-pending-join-details", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("company_join_requests")
        .select("id, company_id, requested_at, status")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Get company names for pending requests
  const pendingCompanyIds = pendingRequestDetails.map(r => r.company_id);
  const { data: pendingCompanyNames = {} } = useQuery({
    queryKey: ["pending-company-names", pendingCompanyIds],
    queryFn: async () => {
      if (pendingCompanyIds.length === 0) return {};
      const { data, error } = await (supabase
        .from("companies_public" as any)
        .select("id, name")
        .in("id", pendingCompanyIds) as any);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const c of data ?? []) map[c.id] = c.name;
      return map;
    },
    enabled: pendingCompanyIds.length > 0,
  });

  const { data: rejectedRequestsRaw = [] } = useQuery({
    queryKey: ["my-rejected-join-requests-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("company_join_requests")
        .select("id, company_id, rejection_reason, reviewed_at, status")
        .eq("user_id", user.id)
        .eq("status", "rejected");
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Build a map for efficient lookup: company_id -> rejection_reason
  const rejectedRequestMap = new Map(
    rejectedRequestsRaw.map(r => [r.company_id, r.rejection_reason])
  );
  const rejectedCompanyIds = Array.from(rejectedRequestMap.keys());

  // Poll for approval: check memberships every 7 seconds when there are pending requests
  const previousMembershipIds = useRef<string[]>(existingMemberships);
  useEffect(() => {
    previousMembershipIds.current = existingMemberships;
  }, [existingMemberships]);

  useEffect(() => {
    if (!user?.id || pendingRequests.length === 0) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("company_memberships")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      const currentIds = data?.map(m => m.company_id) ?? [];
      const prevIds = previousMembershipIds.current;

      // Find newly approved companies
      const newlyApproved = currentIds.filter(id => !prevIds.includes(id));
      if (newlyApproved.length > 0) {
        // Find the company name
        const approvedId = newlyApproved[0];
        const companyName = pendingCompanyNames[approvedId] || allCompanies.find(c => c.id === approvedId)?.name;
        queryClient.invalidateQueries({ queryKey: ["company-memberships"] });
        queryClient.invalidateQueries({ queryKey: ["user-companies"] });
        queryClient.invalidateQueries({ queryKey: ["my-join-requests"] });
        queryClient.invalidateQueries({ queryKey: ["my-pending-join-requests"] });
        toast({
          title: "🎉 You've been approved!",
          description: companyName
            ? `You've been added to ${companyName}!`
            : "Your join request has been approved!",
        });
        navigate("/companies", { replace: true });
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [user?.id, pendingRequests.length, pendingCompanyNames, allCompanies, queryClient, toast, navigate]);

  const filteredCompanies = allCompanies.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase());
    const notMember = !existingMemberships.includes(c.id);
    return matchesSearch && notMember;
  });

  const getFriendlyError = (error: any): string => {
    if (!error) return "Failed to send join request. Please try again.";
    const msg = typeof error === "string" ? error : error?.message || "";
    // Map technical errors to friendly messages
    if (msg.includes("non-2xx") || msg.includes("FunctionsHttpError")) {
      return "Failed to send join request. Please try again.";
    }
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      return "Network error. Please check your internet connection and try again.";
    }
    return msg || "Failed to send join request. Please try again.";
  };

  const handleJoinWithPassword = async () => {
    if (!selectedCompany || !user) return;
    setJoinError(null);

    if (rejectedCompanyIds.includes(selectedCompany.id)) {
      const reason = rejectedRequestMap.get(selectedCompany.id);
      setJoinError(reason
        ? `Your request was rejected: "${reason}". Please contact the admin or try another business.`
        : "Your previous request to join this business was rejected. Please contact the admin or try another business.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-join", {
        body: {
          action: "join-with-password",
          companyId: selectedCompany.id,
          password,
          message,
        },
      });

      if (error) {
        setJoinError(getFriendlyError(error));
        setPassword("");
        setLoading(false);
        return;
      }

      if (data?.error) {
        setJoinError(data.error);
        if (data.code === "INVALID_PASSWORD") {
          setPassword("");
        }
        setLoading(false);
        return;
      }

      toast({ title: "Join request sent!", description: "Waiting for admin approval." });
      setSelectedCompany(null);
      setPassword("");
      setMessage("");
      setJoinError(null);
      queryClient.invalidateQueries({ queryKey: ["my-join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-join-requests"] });
    } catch (err: any) {
      setJoinError(getFriendlyError(err));
      setPassword("");
    }
    setLoading(false);
  };

  const handleCipherJoin = async (companyId: string) => {
    setJoiningCompanyId(companyId);
    try {
      const { data, error } = await supabase.functions.invoke("company-join", {
        body: { action: "cipher-join", companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Joined successfully!", description: "You have been added as admin." });
      queryClient.invalidateQueries({ queryKey: ["company-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["user-companies"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-company"] });
      navigate("/companies");
    } catch (err: any) {
      toast({ title: "Failed to join", description: getFriendlyError(err), variant: "destructive" });
    }
    setJoiningCompanyId(null);
  };

  const handleJoinWithInvite = async () => {
    if (!user) return;
    setInviteError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-join", {
        body: {
          action: "join-with-invite",
          inviteCode,
        },
      });

      if (error) {
        setInviteError(getFriendlyError(error));
        setLoading(false);
        return;
      }

      if (data?.error) {
        setInviteError(data.error);
        setLoading(false);
        return;
      }

      toast({ title: "Joined successfully!", description: "You have been added to the business." });
      queryClient.invalidateQueries({ queryKey: ["company-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["user-companies"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-company"] });
      navigate("/companies");
    } catch (err: any) {
      setInviteError(getFriendlyError(err));
    }
    setLoading(false);
  };

  const handleSelectCompany = (company: any) => {
    if (rejectedCompanyIds.includes(company.id)) {
      const reason = rejectedRequestMap.get(company.id);
      toast({
        title: "Request previously rejected",
        description: reason
          ? `Reason: "${reason}". Please contact the admin or try another business.`
          : "Your previous request to join this business was rejected. Please contact the admin or try another business.",
        variant: "destructive",
      });
      return;
    }
    setJoinError(null);
    setPassword("");
    setSelectedCompany(company);
  };

  const ErrorBanner = ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <p className="text-sm text-destructive flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-destructive/60 hover:text-destructive shrink-0">
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <Link to="/companies">
            <img src={gaLogo} alt="Grammar Addopanto" className="mx-auto h-14 w-auto object-contain" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Join a Business</h1>
            <p className="text-sm text-muted-foreground">Browse businesses or use an invite code to join</p>
          </div>
        </div>

        <Tabs defaultValue="browse">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="gap-2">
              <Search className="h-4 w-4" /> Browse
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-2">
              <Ticket className="h-4 w-4" /> Invite Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Pending requests visual section */}
            {pendingRequestDetails.length > 0 && !selectedCompany && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Pending Requests
                </h3>
                {pendingRequestDetails.map((req) => (
                  <Card key={req.id} className="border-yellow-500/30 bg-yellow-500/5">
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="relative">
                        <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {pendingCompanyNames[req.company_id] || "Business"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Waiting for admin approval...
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs">
                        Pending
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedCompany ? (
              <Card className="border-primary/30 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {selectedCompany.logo_url ? (
                      <img src={selectedCompany.logo_url} alt={selectedCompany.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{selectedCompany.name}</CardTitle>
                      <CardDescription>Enter password to request access</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {joinError && (
                    <ErrorBanner message={joinError} onDismiss={() => setJoinError(null)} />
                  )}
                  <div className="space-y-2">
                    <Label>Business Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (joinError) setJoinError(null); }}
                        placeholder="Enter business password"
                        disabled={loading}
                        className={`pr-10 ${joinError ? "border-destructive" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Ask the business admin for the join password</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell the admin why you want to join..."
                      rows={2}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setSelectedCompany(null); setJoinError(null); setPassword(""); }} disabled={loading}>Cancel</Button>
                    <Button onClick={handleJoinWithPassword} disabled={loading || !password} className="flex-1">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send Join Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredCompanies.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No businesses found</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredCompanies.map((company) => {
                    const isPending = pendingRequests.includes(company.id);
                    const isRejected = rejectedCompanyIds.includes(company.id);
                    const isJoining = joiningCompanyId === company.id;
                    const anyJoining = joiningCompanyId !== null;
                    const isDisabled = isPending || isRejected || anyJoining;
                    return (
                      <Card
                        key={company.id}
                        className={`cursor-pointer transition-all ${isDisabled ? "opacity-60" : "hover:border-primary/50 hover:shadow-sm"}`}
                        onClick={() => !isDisabled && handleSelectCompany(company)}
                      >
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            {company.logo_url ? (
                              <img src={company.logo_url} alt={company.name} className="h-10 w-10 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{company.name}</p>
                              {company.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{company.description}</p>
                              )}
                            </div>
                          </div>
                          {isRejected ? (
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" /> Rejected
                              </Badge>
                              {rejectedRequestMap.get(company.id) && (
                                <p className="text-xs text-destructive max-w-[180px] text-right line-clamp-2">
                                  {rejectedRequestMap.get(company.id)}
                                </p>
                              )}
                            </div>
                          ) : isPending ? (
                            <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                              Pending
                            </Badge>
                          ) : isCipher ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={anyJoining}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCipherJoin(company.id);
                              }}
                            >
                              {isJoining ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-1 h-3 w-3" />}
                              {isJoining ? "Joining..." : "Join"}
                            </Button>
                          ) : (
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Join with Invite Code</CardTitle>
                    <CardDescription>Got an invite code? Enter it below to join instantly</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {inviteError && (
                  <ErrorBanner message={inviteError} onDismiss={() => setInviteError(null)} />
                )}
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); if (inviteError) setInviteError(null); }}
                    placeholder="e.g. AB12CD34"
                    maxLength={12}
                    className={`font-mono text-center tracking-widest text-lg ${inviteError ? "border-destructive" : ""}`}
                  />
                  <p className="text-xs text-muted-foreground">The code is case-insensitive and provided by the business admin</p>
                </div>
                <Button onClick={handleJoinWithInvite} disabled={loading || !inviteCode} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Join Business
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
