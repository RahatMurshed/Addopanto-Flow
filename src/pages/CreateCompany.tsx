import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Building2, Link2, FileText, KeyRound } from "lucide-react";
import { Navigate } from "react-router-dom";
import gaLogo from "@/assets/GA-LOGO.png";

export default function CreateCompany() {
  const { user } = useAuth();
  const { isCipher } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [currency, setCurrency] = useState("BDT");

  if (!isCipher) return <Navigate to="/companies" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("company-join", {
        body: {
          action: "create-company",
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          description: description || null,
          joinPassword: joinPassword || null,
          currency,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Company created!" });
      navigate("/companies");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
            <h1 className="text-2xl font-bold">Create Company</h1>
            <p className="text-sm text-muted-foreground">Set up a new company workspace</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Basic Information
                </div>
                <div className="space-y-2">
                  <Label>Company Name <span className="text-destructive">*</span></Label>
                  <Input value={name} onChange={(e) => {
                    const val = e.target.value;
                    setName(val);
                    if (!slugManuallyEdited) {
                      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                    }
                  }} placeholder="My Company" required />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" /> URL Slug
                  </Label>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    placeholder="my-company"
                  />
                  <p className="text-xs text-muted-foreground">Users will search this slug to find your company</p>
                </div>
              </div>

              <Separator />

              {/* Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Details
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of your company..." rows={2} />
                </div>
              </div>

              <Separator />

              {/* Security Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <KeyRound className="h-4 w-4" />
                  Access & Security
                </div>
                <div className="space-y-2">
                  <Label>Join Password</Label>
                  <Input value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} placeholder="Set a password for joining..." />
                  <p className="text-xs text-muted-foreground">Users need this password to request joining your company</p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !name}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Company
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
