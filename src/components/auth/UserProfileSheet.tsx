import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Phone, Mail, MapPin, Building2, BadgeCheck, Calendar, FileText, Globe,
} from "lucide-react";

interface UserProfileSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileField {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}

export function UserProfileSheet({ userId, open, onOpenChange }: UserProfileSheetProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile-sheet", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && open,
  });

  const fields: ProfileField[] = [
    { icon: <Mail className="h-4 w-4" />, label: "Email", value: profile?.email },
    { icon: <Phone className="h-4 w-4" />, label: "Phone", value: profile?.phone },
    { icon: <Phone className="h-4 w-4" />, label: "Alt Phone", value: profile?.alt_phone },
    { icon: <MapPin className="h-4 w-4" />, label: "Address", value: profile?.address },
    { icon: <MapPin className="h-4 w-4" />, label: "City", value: profile?.city },
    { icon: <Globe className="h-4 w-4" />, label: "Country", value: profile?.country },
    { icon: <Building2 className="h-4 w-4" />, label: "Department", value: profile?.department },
    { icon: <BadgeCheck className="h-4 w-4" />, label: "Employee ID", value: profile?.employee_id },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Date of Birth",
      value: profile?.date_of_birth ? format(new Date(profile.date_of_birth), "MMM d, yyyy") : null,
    },
    { icon: <FileText className="h-4 w-4" />, label: "Bio", value: profile?.bio },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Joined",
      value: profile?.created_at ? format(new Date(profile.created_at), "MMM d, yyyy") : null,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>User Profile</SheetTitle>
          <SheetDescription>Read-only profile details</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground pt-4">No profile found for this user.</p>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Avatar & Name */}
            <div className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={profile.avatar_url}
                fullName={profile.full_name}
                email={profile.email}
                size="lg"
              />
              <div>
                <p className="font-semibold text-lg">{profile.full_name || "Unnamed"}</p>
                <p className="text-sm text-muted-foreground">{profile.email || "No email"}</p>
              </div>
            </div>

            <Separator />

            {/* Profile Fields */}
            <div className="space-y-3">
              {fields
                .filter((f) => f.label !== "Email") // already shown above
                .map((field) => (
                  <div key={field.label} className="flex items-start gap-3">
                    <span className="text-muted-foreground mt-0.5 shrink-0">{field.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      <p className="text-sm break-words">
                        {field.value || <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
