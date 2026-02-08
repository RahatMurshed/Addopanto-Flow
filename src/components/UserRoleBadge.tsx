import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { Shield, ShieldCheck, User, Eye } from "lucide-react";

interface UserRoleBadgeProps {
  role: AppRole;
  size?: "sm" | "md";
  showIcon?: boolean;
}

const roleConfig: Record<AppRole, { label: string; className: string; icon: typeof Shield }> = {
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
};

export function UserRoleBadge({ role, size = "md", showIcon = true }: UserRoleBadgeProps) {
  const config = roleConfig[role];
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
