import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { DataManagementSection } from "@/components/DataManagementSection";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { ImageUpload } from "@/components/ImageUpload";
import { SUPPORTED_CURRENCIES, formatCurrency } from "@/utils/currencyUtils";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { isLoading: roleLoading, isCompanyAdmin, isCipher, isDataEntryOperator, activeCompany, activeCompanyId, refetch: refetchCompany } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [fiscalMonth, setFiscalMonth] = useState("1");

  // Business logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    businessName: "",
    currency: "BDT",
    exchangeRate: "1",
    fiscalMonth: "1",
  });

  const isDirty =
    businessName !== originalValues.businessName ||
    currency !== originalValues.currency ||
    exchangeRate !== originalValues.exchangeRate ||
    fiscalMonth !== originalValues.fiscalMonth;

  const blocker = useUnsavedChanges(isDirty);

  // Redirect non-admin users (including DEOs) away from settings
  useEffect(() => {
    if (!roleLoading && !isCompanyAdmin && !isCipher) {
      navigate("/dashboard", { replace: true });
    }
  }, [roleLoading, isCompanyAdmin, isCipher, navigate]);

  // Initialize from active company
  useEffect(() => {
    if (!user || !activeCompany) return;
    const bName = activeCompany.name || "";
    const curr = activeCompany.currency || "BDT";
    const rate = String((activeCompany as any).exchange_rate ?? 1);
    const fiscal = String(activeCompany.fiscal_year_start_month || 1);
    
    setBusinessName(bName);
    setCurrency(curr);
    setExchangeRate(rate);
    setFiscalMonth(fiscal);
    setOriginalValues({ businessName: bName, currency: curr, exchangeRate: rate, fiscalMonth: fiscal });
    setLoading(false);
  }, [user, activeCompany]);

  const exchangeRateNum = parseFloat(exchangeRate) || 0;
  const isExchangeRateValid = exchangeRateNum > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeCompanyId) return;
    if (!isExchangeRateValid) {
      toast({ title: "Invalid exchange rate", description: "Exchange rate must be a positive number", variant: "destructive" });
      return;
    }
    setSaving(true);

    const currencyChanged = currency !== originalValues.currency || exchangeRate !== originalValues.exchangeRate;

    // Update company: name, currency, exchange_rate, fiscal_year_start_month
    const { error: companyError } = await supabase
      .from("companies")
      .update({
        name: businessName,
        currency,
        exchange_rate: exchangeRateNum,
        fiscal_year_start_month: parseInt(fiscalMonth),
      } as any)
      .eq("id", activeCompanyId);

    if (!companyError && currencyChanged) {
      // Insert audit log
      await supabase.from("currency_change_logs" as any).insert({
        company_id: activeCompanyId,
        changed_by: user.id,
        old_currency: originalValues.currency,
        new_currency: currency,
        old_exchange_rate: parseFloat(originalValues.exchangeRate) || 1,
        new_exchange_rate: exchangeRateNum,
      });
    }

    // Sync currency to user profile too for backwards compat
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        currency,
        fiscal_year_start_month: parseInt(fiscalMonth),
      })
      .eq("user_id", user.id);

    setSaving(false);
    const error = companyError || profileError;
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      setOriginalValues({ businessName, currency, exchangeRate, fiscalMonth });
      await queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      await queryClient.resetQueries({ queryKey: ["user-companies"] });
      refetchCompany();
      toast({ title: "Settings saved" });
    }
  };

  const handleLogoSave = async () => {
    if (!logoFile || !activeCompanyId || !user) return;
    setSavingLogo(true);
    try {
      const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${activeCompanyId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, logoFile, { upsert: true, contentType: logoFile.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: logoUrl })
        .eq("id", activeCompanyId);

      if (updateError) throw updateError;

      setLogoFile(null);
      setLogoPreviewUrl(null);
      refetchCompany();
      await queryClient.invalidateQueries({ queryKey: ["user-companies"] });
      toast({ title: "Business logo updated" });
    } catch (err: any) {
      toast({ title: "Error uploading logo", description: err.message, variant: "destructive" });
    } finally {
      setSavingLogo(false);
    }
  };

  // Show loading state while fetching data
  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your business profile</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>Configure your business details and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input id="business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your Business Name" disabled={saving} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={(val) => { setCurrency(val); if (val === "BDT") setExchangeRate("1"); }} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fiscal Year Starts</Label>
                  <Select value={fiscalMonth} onValueChange={setFiscalMonth} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="space-y-2">
                <Label htmlFor="exchange-rate">
                  Exchange Rate {currency !== "BDT" && <span className="text-muted-foreground font-normal">— 1 {currency} = ? BDT</span>}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="exchange-rate"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    disabled={saving || currency === "BDT"}
                    className={!isExchangeRateValid && exchangeRate !== "" ? "border-destructive" : ""}
                  />
                </div>
                {!isExchangeRateValid && exchangeRate !== "" && (
                  <p className="text-xs text-destructive">Exchange rate must be a positive number</p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {currency === "BDT"
                    ? "Base currency — no conversion needed."
                    : `Enter how many BDT equal 1 ${currency}. E.g. if 1 USD = 120 BDT, enter 120.`}
                </p>
              </div>

              {/* Live Preview */}
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Live Preview (BDT → {currency})</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">৳100</p>
                      <p className="font-semibold">{formatCurrency(isExchangeRateValid ? 100 / exchangeRateNum : 100, currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">৳1,000</p>
                      <p className="font-semibold">{formatCurrency(isExchangeRateValid ? 1000 / exchangeRateNum : 1000, currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">৳50,000</p>
                      <p className="font-semibold">{formatCurrency(isExchangeRateValid ? 50000 / exchangeRateNum : 50000, currency)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={saving || !isExchangeRateValid}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Business Logo Card */}
        <Card>
          <CardHeader>
            <CardTitle>Business Logo</CardTitle>
            <CardDescription>Update the logo for {activeCompany?.name || "your business"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              value={activeCompany?.logo_url}
              onChange={(url) => {
                if (!url) {
                  setLogoFile(null);
                  setLogoPreviewUrl(null);
                }
              }}
              onFileSelect={(file) => {
                setLogoFile(file);
                setLogoPreviewUrl(URL.createObjectURL(file));
              }}
              variant="logo"
              label="Upload Logo"
              fallbackText={activeCompany?.name || ""}
              disabled={savingLogo}
            />
            {logoFile && (
              <Button onClick={handleLogoSave} disabled={savingLogo} size="sm">
                {savingLogo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {savingLogo ? "Uploading..." : "Save Logo"}
              </Button>
            )}
          </CardContent>
        </Card>

        <DataManagementSection />
      </div>

      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}
