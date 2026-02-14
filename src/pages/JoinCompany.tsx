import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Loader2, Search, KeyRound, Ticket, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function JoinCompany() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
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

  // Filter out companies user is already a member of
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

  // Also get pending join requests
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
      navigate("/companies");
    } catch (err: any) {
      toast({ title: "Failed to join", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Join a Company</h1>
            <p className="text-muted-foreground">Enter a company using password or invite code</p>
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
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {selectedCompany ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selectedCompany.name}</CardTitle>
                  <CardDescription>Enter the company password to send a join request</CardDescription>
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
                  </div>
                  <div className="space-y-2">
                    <Label>Message (optional)</Label>
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
                    <Button onClick={handleJoinWithPassword} disabled={loading || !password}>
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
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No companies found
                    </CardContent>
                  </Card>
                ) : (
                  filteredCompanies.map((company) => {
                    const isPending = pendingRequests.includes(company.id);
                    return (
                      <Card
                        key={company.id}
                        className={`cursor-pointer transition-all ${isPending ? "opacity-60" : "hover:border-primary/50"}`}
                        onClick={() => !isPending && setSelectedCompany(company)}
                      >
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{company.name}</p>
                              {company.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{company.description}</p>
                              )}
                            </div>
                          </div>
                          {isPending ? (
                            <span className="text-xs text-yellow-600">Pending</span>
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
                <CardTitle className="text-base">Join with Invite Code</CardTitle>
                <CardDescription>Enter an invite code to join a company instantly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter invite code"
                    maxLength={12}
                  />
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
