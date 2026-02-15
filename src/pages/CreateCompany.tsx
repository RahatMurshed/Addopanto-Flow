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
import { ArrowLeft, Loader2, Building2, Link2, FileText, KeyRound, ImageIcon, Users, Mail, Phone, Briefcase, MessageSquare } from "lucide-react";
import { Navigate } from "react-router-dom";
import gaLogo from "@/assets/GA-LOGO.png";
import { ImageUpload } from "@/components/ImageUpload";

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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Extra fields for non-cipher creation requests
  const [industry, setIndustry] = useState("");
  const [estimatedStudents, setEstimatedStudents] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [reason, setReason] = useState("");

  const uploadLogo = async (companyId: string): Promise<string | null> => {
    if (!logoFile) return null;
    const ext = logoFile.name.split(".").pop();
    const path = `${companyId}/logo.${ext}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, logoFile, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(path);
    return urlData.publicUrl;
  };

  // Cipher: direct creation
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

      if (logoFile && data?.company?.id) {
        try {
          const logoUrl = await uploadLogo(data.company.id);
          if (logoUrl) {
            await supabase.from("companies").update({ logo_url: logoUrl }).eq("id", data.company.id);
          }
        } catch (logoErr) {
          console.error("Logo upload failed:", logoErr);
        }
      }

      toast({ title: "Business created!" });
      navigate("/companies");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // Non-cipher: submit creation request
  const handleRequestCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const companySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      // Upload logo to a temporary location if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `creation-requests/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("company-logos").upload(path, logoFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(path);
          logoUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("company_creation_requests").insert({
        user_id: user.id,
        company_name: name,
        company_slug: companySlug,
        description: description || null,
        logo_url: logoUrl,
        industry: industry || null,
        estimated_students: estimatedStudents ? parseInt(estimatedStudents) : null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        reason: reason || null,
      });

      if (error) throw error;

      toast({ title: "Request submitted!", description: "Your company creation request is under review." });
      navigate("/companies");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

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
            <h1 className="text-2xl font-bold">{isCipher ? "Create Business" : "Request New Business"}</h1>
            <p className="text-sm text-muted-foreground">
              {isCipher ? "Set up a new business workspace" : "Submit a request to create a new business"}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={isCipher ? handleCreate : handleRequestCreation} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Basic Information
                </div>
                <div className="space-y-2">
                  <Label>Business Name <span className="text-destructive">*</span></Label>
                  <Input value={name} onChange={(e) => {
                    const val = e.target.value;
                    setName(val);
                    if (!slugManuallyEdited) {
                      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                    }
                  }} placeholder="My Business" required />
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
                    placeholder="my-business"
                  />
                  <p className="text-xs text-muted-foreground">Users will search this slug to find your business</p>
                </div>
              </div>

              <Separator />

              {/* Logo */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  Business Logo
                </div>
                <ImageUpload
                  value={logoPreview}
                  onChange={(url) => {
                    setLogoPreview(url);
                    if (!url) setLogoFile(null);
                  }}
                  onFileSelect={(file) => setLogoFile(file)}
                  label="Upload Logo"
                  variant="logo"
                  disabled={loading}
                />
              </div>

              <Separator />

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Details
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of your business..." rows={2} />
                </div>
              </div>

              {/* Extra fields for non-cipher requests */}
              {!isCipher && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      Additional Details
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Education" />
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Students</Label>
                        <Input type="number" value={estimatedStudents} onChange={(e) => setEstimatedStudents(e.target.value)} placeholder="e.g. 50" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Contact Email</Label>
                        <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@business.com" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Contact Phone</Label>
                        <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1234567890" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Reason for Request</Label>
                      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you want to create this business?" rows={2} />
                    </div>
                  </div>
                </>
              )}

              {/* Security (cipher only) */}
              {isCipher && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <KeyRound className="h-4 w-4" />
                      Access & Security
                    </div>
                    <div className="space-y-2">
                      <Label>Join Password</Label>
                      <Input value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} placeholder="Set a password for joining..." />
                      <p className="text-xs text-muted-foreground">Users need this password to request joining your business</p>
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading || !name}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCipher ? "Create Business" : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
