import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { Shield, ShieldCheck, User, Eye, Clock } from "lucide-react";

interface UserRoleBadgeProps {
  role: AppRole | null;
  size?: "sm" | "md";
  showIcon?: boolean;
}

const roleConfig: Record<AppRole | "pending", { label: string; className: string; icon: typeof Shield }> = {
  cipher: {
    label: "Cipher",
    className: "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0",
    icon: Eye,
  },
  admin: {
    label: "Admin",
    className: "bg-primary text-primary-foreground border-0",
    icon: ShieldCheck,
  },
  moderator: {
    label: "Moderator",
    className: "bg-blue-500 text-white border-0",
    icon: Shield,
  },
  user: {
    label: "User",
    className: "bg-secondary text-secondary-foreground",
    icon: User,
  },
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground",
    icon: Clock,
  },
};

export function UserRoleBadge({ role, size = "md", showIcon = true }: UserRoleBadgeProps) {
  // Handle null role (pending users)
  const configKey = role ?? "pending";
  const config = roleConfig[configKey];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        config.className,
        size === "sm" ? "text-xs px-1.5 py-0" : "text-xs px-2 py-0.5"
      )}
    >
      {showIcon && <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}
