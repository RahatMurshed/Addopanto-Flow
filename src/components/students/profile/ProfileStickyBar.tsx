import { MessageCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cleanPhone } from "./ProfileHeader";

interface ProfileStickyBarProps {
  visible: boolean;
  student: {
    name: string;
    status: string;
    phone?: string | null;
    photo_url?: string | null;
  };
  canEdit: boolean;
  onEdit: () => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100 dark:bg-green-800/40", text: "text-green-800 dark:text-green-300", label: "Active" },
  inactive: { bg: "bg-red-100 dark:bg-red-800/40", text: "text-red-800 dark:text-red-300", label: "Inactive" },
  graduated: { bg: "bg-blue-100 dark:bg-blue-800/40", text: "text-blue-800 dark:text-blue-300", label: "Graduated" },
};

export function ProfileStickyBar({ visible, student, canEdit, onEdit }: ProfileStickyBarProps) {
  const status = STATUS_CONFIG[student.status] || STATUS_CONFIG.inactive;
  const initials = student.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      className={cn(
        "sticky top-0 z-50 bg-secondary shadow-md transition-all duration-200 no-print",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 h-14 flex items-center gap-3">
        {/* Small avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          {student.photo_url && <AvatarFallback>{/* image handled below */}</AvatarFallback>}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <span className="text-secondary-foreground font-semibold text-sm truncate">
          {student.name}
        </span>

        {/* Status badge */}
        <Badge className={cn("text-xs rounded-full border-0 shrink-0", status.bg, status.text)}>
          <span className="mr-1">●</span>{status.label}
        </Badge>

        {/* Spacer */}
        <div className="flex-1" />

        {/* WhatsApp */}
        {student.phone && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`https://wa.me/${cleanPhone(student.phone).replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white hover:opacity-90 transition-opacity shrink-0"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>Chat on WhatsApp</TooltipContent>
          </Tooltip>
        )}

        {/* Edit button — hidden on mobile */}
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex bg-transparent border-white/70 text-white hover:bg-white/15 hover:text-white"
            onClick={onEdit}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
