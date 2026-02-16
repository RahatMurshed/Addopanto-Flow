import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { Eye, User, Clock } from "lucide-react";

interface UserRoleBadgeProps {
  role: AppRole | null;
  size?: "sm" | "md";
  showIcon?: boolean;
}

const roleConfig: Record<AppRole | "pending", { label: string; className: string; icon: typeof Eye }> = {
  cipher: {
    label: "Cipher",
    className: "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0",
    icon: Eye,
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

// Company role badge for member pages
type CompanyRole = "admin" | "moderator";

const companyRoleConfig: Record<CompanyRole, { label: string; className: string }> = {
  admin: {
    label: "Admin",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  moderator: {
    label: "Moderator",
    className: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
  },
};

export function CompanyRoleBadge({ role, size = "md" }: { role: string; size?: "sm" | "md" }) {
  const config = companyRoleConfig[role as CompanyRole] ?? companyRoleConfig.moderator;
  return (
    <Badge className={cn(config.className, size === "sm" ? "text-xs px-1.5 py-0" : "text-xs px-2 py-0.5")}>
      {config.label}
    </Badge>
  );
}
