import { forwardRef } from "react";
import { format } from "date-fns";
import { Pencil, Mail, MapPin, CalendarDays, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface StudentData {
  id: string;
  name: string;
  student_id_number?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  enrollment_date: string;
  photo_url?: string | null;
  address_house?: string | null;
  address_street?: string | null;
  address_area?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_pin_zip?: string | null;
  created_at?: string;
  [key: string]: any;
}

interface ProfileHeaderProps {
  student: StudentData;
  canEdit: boolean;
  onEdit: () => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Active" },
  inactive: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Inactive" },
  graduated: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "Graduated" },
  on_hold: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-500", label: "On Hold" },
};

export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+880${digits.slice(1)}`;
  return `+880${digits}`;
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export const ProfileHeader = forwardRef<HTMLDivElement, ProfileHeaderProps>(
  ({ student, canEdit, onEdit }, ref) => {
    const status = STATUS_CONFIG[student.status] || STATUS_CONFIG.inactive;
    const initials = getInitials(student.name);
    const address = [student.address_house, student.address_street, student.address_area, student.address_city, student.address_state].filter(Boolean).join(", ");
    const addedDate = student.created_at ? format(new Date(student.created_at), "MMM d, yyyy") : null;

    return (
      <div
        ref={ref}
        className="bg-card rounded-xl shadow-sm border border-border p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-20 w-20 ring-4 ring-card shadow-md shrink-0 self-center sm:self-start">
            {student.photo_url && <AvatarImage src={student.photo_url} alt={student.name} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name & Meta */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            {/* Row 1 — Name */}
            <h1 className="text-2xl font-bold text-secondary">{student.name}</h1>

            {/* Row 2 — ID + Phone + WhatsApp */}
            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center sm:justify-start">
              {student.student_id_number && (
                <span className="bg-muted text-muted-foreground text-xs font-mono px-3 py-1 rounded-full">
                  ID: {student.student_id_number}
                </span>
              )}
              {student.phone && (
                <>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {student.phone}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={`https://wa.me/${cleanPhone(student.phone).replace("+", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "#25D366" }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Chat on WhatsApp</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>

            {/* Row 3 — Tags placeholder */}
            {/* Student tags render here — added in Prompt 9 */}
          </div>

          {/* Status + Edit */}
          <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
            <Badge className={cn("text-sm font-semibold px-4 py-1.5 rounded-full border-0", status.bg, status.text)}>
              <span className="mr-1.5">●</span>
              {status.label}
            </Badge>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground transition-colors"
                onClick={onEdit}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Student
              </Button>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="border-t border-border mt-4 pt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {student.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {student.email}
                </span>
              </TooltipTrigger>
              <TooltipContent>{student.email}</TooltipContent>
            </Tooltip>
          )}
          {address && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {address}
                </span>
              </TooltipTrigger>
              <TooltipContent>{address}</TooltipContent>
            </Tooltip>
          )}
          {addedDate && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              Added on {addedDate}
            </span>
          )}
        </div>
      </div>
    );
  }
);

ProfileHeader.displayName = "ProfileHeader";
