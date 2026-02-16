import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Loader2, Save, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileFormData {
  full_name: string;
  phone: string;
  alt_phone: string;
  address: string;
  city: string;
  country: string;
  department: string;
  employee_id: string;
  date_of_birth: string;
  bio: string;
}

const emptyForm: ProfileFormData = {
  full_name: "",
  phone: "",
  alt_phone: "",
  address: "",
  city: "",
  country: "",
  department: "",
  employee_id: "",
  date_of_birth: "",
  bio: "",
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileFormData>(emptyForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile-full", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: (profile as any).phone || "",
        alt_phone: (profile as any).alt_phone || "",
        address: (profile as any).address || "",
        city: (profile as any).city || "",
        country: (profile as any).country || "",
        department: (profile as any).department || "",
        employee_id: (profile as any).employee_id || "",
        date_of_birth: (profile as any).date_of_birth || "",
        bio: (profile as any).bio || "",
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      let finalAvatarUrl = avatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("profile-avatars")
          .getPublicUrl(path);
        finalAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      // Sanitize text fields
      const sanitize = (val: string) => val.replace(/<[^>]*>/g, "").trim();

      const { error } = await supabase
        .from("user_profiles")
        .update({
          full_name: sanitize(form.full_name) || null,
          avatar_url: finalAvatarUrl,
          phone: sanitize(form.phone) || null,
          alt_phone: sanitize(form.alt_phone) || null,
          address: sanitize(form.address) || null,
          city: sanitize(form.city) || null,
          country: sanitize(form.country) || null,
          department: sanitize(form.department) || null,
          employee_id: sanitize(form.employee_id) || null,
          date_of_birth: form.date_of_birth || null,
          bio: sanitize(form.bio) || null,
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile-full"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["member-profiles"] });
      toast({ title: "Profile saved successfully" });
      setAvatarFile(null);
    },
    onError: (err: any) => {
      toast({ title: "Error saving profile", description: err.message, variant: "destructive" });
    },
  });

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <User className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your personal information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
            onFileSelect={setAvatarFile}
            label="Upload Photo"
            variant="avatar"
            fallbackText={form.full_name}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alt_phone">Alternative Phone</Label>
              <Input
                id="alt_phone"
                value={form.alt_phone}
                onChange={(e) => handleChange("alt_phone", e.target.value)}
                placeholder="Alternative number"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City / State</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="City, State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department">Department / Designation</Label>
              <Input
                id="department"
                value={form.department}
                onChange={(e) => handleChange("department", e.target.value)}
                placeholder="e.g. Finance, Teaching"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID (Optional)</Label>
              <Input
                id="employee_id"
                value={form.employee_id}
                onChange={(e) => handleChange("employee_id", e.target.value)}
                placeholder="EMP-001"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => handleChange("date_of_birth", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Join Date</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {profile?.created_at ? format(new Date(profile.created_at), "MMM dd, yyyy") : "—"}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="bio">Bio / Notes</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
