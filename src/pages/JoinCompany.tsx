import { useState } from "react";
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
import { Building2, ArrowLeft, Loader2, Search, KeyRound, Ticket, Eye, EyeOff, ShieldCheck, Users } from "lucide-react";
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

  const { data: allCompanies = [] } = useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("companies_public" as any)
        .select("id, name, slug, description, logo_url")
        .order("name") as any);
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

  const filteredCompanies = allCompanies.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase());
    const notMember = !existingMemberships.includes(c.id);
    return matchesSearch && notMember;
  });

  const handleJoinWithPassword = async () => {
    if (!selectedCompany || !user) return;
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
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Join request sent!", description: "Waiting for admin approval." });
      setSelectedCompany(null);
      setPassword("");
      setMessage("");
    } catch (err: any) {
      toast({ title: "Failed to join", description: err.message, variant: "destructive" });
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
      toast({ title: "Failed to join", description: err.message, variant: "destructive" });
    }
    setJoiningCompanyId(null);
  };

  const handleJoinWithInvite = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-join", {
        body: {
          action: "join-with-invite",
          inviteCode,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Joined successfully!", description: "You have been added to the company." });
      queryClient.invalidateQueries({ queryKey: ["company-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["user-companies"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-company"] });
      navigate("/companies");
    } catch (err: any) {
      toast({ title: "Failed to join", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Branding header */}
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
            <h1 className="text-2xl font-bold">Join a Company</h1>
            <p className="text-sm text-muted-foreground">Browse companies or use an invite code to join</p>
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
                  <div className="space-y-2">
                    <Label>Company Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter company password"
                        disabled={loading}
                        className="pr-10"
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
                    <p className="text-xs text-muted-foreground">Ask the company admin for the join password</p>
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
                    <Button variant="outline" onClick={() => setSelectedCompany(null)} disabled={loading}>Cancel</Button>
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
                      <p className="text-muted-foreground">No companies found</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredCompanies.map((company) => {
                    const isPending = pendingRequests.includes(company.id);
                    const isJoining = joiningCompanyId === company.id;
                    const anyJoining = joiningCompanyId !== null;
                    return (
                      <Card
                        key={company.id}
                        className={`cursor-pointer transition-all ${isPending ? "opacity-60" : "hover:border-primary/50 hover:shadow-sm"}`}
                        onClick={() => !isPending && !anyJoining && setSelectedCompany(company)}
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
                          {isPending ? (
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
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB12CD34"
                    maxLength={12}
                    className="font-mono text-center tracking-widest text-lg"
                  />
                  <p className="text-xs text-muted-foreground">The code is case-insensitive and provided by the company admin</p>
                </div>
                <Button onClick={handleJoinWithInvite} disabled={loading || !inviteCode} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Join Company
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}