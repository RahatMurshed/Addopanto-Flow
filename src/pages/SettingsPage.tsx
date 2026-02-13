import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DataManagementSection } from "@/components/DataManagementSection";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { isLoading: roleLoading, hasNoRole, isModerator, isCipher, isAdmin } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [fiscalMonth, setFiscalMonth] = useState("1");

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    businessName: "",
    currency: "BDT",
    fiscalMonth: "1",
  });

  const isDirty =
    businessName !== originalValues.businessName ||
    currency !== originalValues.currency ||
    fiscalMonth !== originalValues.fiscalMonth;

  const blocker = useUnsavedChanges(isDirty);

  // Redirect moderators away from settings
  useEffect(() => {
    if (!roleLoading && isModerator) {
      navigate("/", { replace: true });
    }
  }, [roleLoading, isModerator, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const bName = data.business_name || "";
          const curr = data.currency;
          const fiscal = String(data.fiscal_year_start_month);
          setBusinessName(bName);
          setCurrency(curr);
          setFiscalMonth(fiscal);
          setOriginalValues({
            businessName: bName,
            currency: curr,
            fiscalMonth: fiscal,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_profiles")
      .update({
        business_name: businessName,
        currency,
        fiscal_year_start_month: parseInt(fiscalMonth),
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      // Update original values after successful save
      setOriginalValues({
        businessName,
        currency,
        fiscalMonth,
      });
      // Invalidate the user profile cache so all pages get the updated settings
      await queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      toast({ title: "Settings saved" });
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
                  <Select value={currency} onValueChange={setCurrency} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDT">BDT (৳)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
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
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <DataManagementSection />
      </div>

      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}
