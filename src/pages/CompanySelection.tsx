import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, UserPlus, LogOut, Loader2, Users, Clock, XCircle, ChevronRight } from "lucide-react";
import gaLogo from "@/assets/GA-LOGO.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function NoCompaniesSection({ isCipher, navigate, signOut }: { isCipher: boolean; navigate: (path: string) => void; signOut: () => Promise<void> }) {
  const { user } = useAuth();

  const { data: regStatus, isLoading: regLoading } = useQuery({
    queryKey: ["registration-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("registration_requests")
        .select("status, rejection_reason, banned_until")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !isCipher,
  });

  if (!isCipher && regLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Pending registration
  if (!isCipher && regStatus?.status === "pending") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Pending Approval</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Your account is awaiting admin approval. You'll get access once an administrator reviews your request.
          </p>
          <Button variant="ghost" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Rejected / banned
  if (!isCipher && regStatus?.status === "rejected") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Your registration request was rejected.{regStatus.rejection_reason ? ` Reason: ${regStatus.rejection_reason}` : ""}
          </p>
          <Button variant="ghost" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Normal no-companies state — auto-redirect handled in parent useEffect
  return null;
}

export default function CompanySelection() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { companies, memberships, switchCompany, isCipher, isLoading } = useCompany();

  // Fetch cipher user IDs for member count filtering
  const { data: cipherUserIds = [] } = useQuery({
    queryKey: ["cipher-user-ids-for-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "cipher");
      if (error) throw error;
      return data.map(r => r.user_id);
    },
    enabled: !isCipher && companies.length > 0,
  });

  // Get member counts for each company (filter out ciphers for non-cipher users)
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
        // Filter out cipher users from counts for non-cipher viewers
        if (!isCipher && cipherUserIds.includes(row.user_id)) continue;
        counts[row.company_id] = (counts[row.company_id] || 0) + 1;
      }
      return counts;
    },
    enabled: companies.length > 0,
  });

  // Check registration status for no-companies redirect logic
  const { data: regStatus, isLoading: regLoading } = useQuery({
    queryKey: ["registration-status-redirect", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("registration_requests")
        .select("status")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !isCipher && companies.length === 0 && !isLoading,
  });

  // Auto-redirect to join page when user has no companies and no pending/rejected status
  useEffect(() => {
    if (isLoading || regLoading) return;
    if (companies.length === 0 && !isCipher) {
      const status = regStatus?.status;
      if (!status || (status !== "pending" && status !== "rejected")) {
        navigate("/companies/join", { replace: true });
      }
    }
  }, [companies.length, isCipher, isLoading, regLoading, regStatus, navigate]);

  const handleSelectCompany = async (companyId: string) => {
    await switchCompany(companyId);
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

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
    const colors = {
      admin: "bg-primary/15 text-primary border-primary/30",
      moderator: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
      viewer: "bg-muted text-muted-foreground",
    };
    return <Badge className={colors[m.role] || ""}>{m.role}</Badge>;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link to="/"><img src={gaLogo} alt="Grammar Addopanto" className="mx-auto h-14 w-auto object-contain" /></Link>
          <h1 className="text-2xl font-bold">Select a Business</h1>
          <p className="text-muted-foreground">Choose a business to continue</p>
        </div>

        {companies.length === 0 ? (
          <NoCompaniesSection isCipher={isCipher} navigate={navigate} signOut={signOut} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {companies.map((company) => (
              <Card
                key={company.id}
                className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
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
                        <CardTitle className="text-base">{company.name}</CardTitle>
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
        )}

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate("/companies/join")}>
            <UserPlus className="mr-2 h-4 w-4" /> Join Business
          </Button>
          {isCipher && (
            <Button onClick={() => navigate("/companies/create")}>
              <Plus className="mr-2 h-4 w-4" /> Create Business
            </Button>
          )}
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}