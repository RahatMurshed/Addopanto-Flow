import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, CreditCard, Layers, TrendingUp } from "lucide-react";
import type { CompanyMembership } from "@/contexts/CompanyContext";

interface PermissionAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CompanyMembership;
  memberName: string;
  onPermissionChange: (key: string, value: boolean) => void;
}

const DEO_CATEGORIES = [
  { key: "deo_students", label: "Student Management", description: "Add, edit, and delete students they created", icon: GraduationCap },
  { key: "deo_payments", label: "Payment Recording", description: "Record, edit, and delete payments they entered", icon: CreditCard },
  { key: "deo_batches", label: "Batch Management", description: "Create, edit, and delete batches they created", icon: Layers },
  { key: "deo_finance", label: "Revenue & Expenses", description: "Add, edit, and delete revenue/expense entries they created", icon: TrendingUp },
] as const;

export function PermissionAssignmentModal({
  open,
  onOpenChange,
  member,
  memberName,
  onPermissionChange,
}: PermissionAssignmentModalProps) {
  if (member.role !== "moderator") return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Moderator Permissions</DialogTitle>
          <DialogDescription>
            Configure access for <strong>{memberName}</strong>. When enabled, the moderator can add/edit/delete their own entries only.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEO_CATEGORIES.map((cat) => {
            const isOn = member[cat.key as keyof CompanyMembership] as boolean;
            const Icon = cat.icon;
            return (
              <Card key={cat.key} className={`border transition-colors ${isOn ? "border-primary/40 bg-primary/5" : ""}`}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={`mt-0.5 rounded-lg p-2 ${isOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`${member.id}-${cat.key}`} className="text-sm font-medium cursor-pointer">
                        {cat.label}
                      </Label>
                      <Switch
                        id={`${member.id}-${cat.key}`}
                        checked={isOn}
                        onCheckedChange={(v) => onPermissionChange(cat.key, v)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
