import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, CreditCard, Layers, TrendingUp, Receipt } from "lucide-react";
import type { CompanyMembership } from "@/contexts/CompanyContext";

interface PermissionAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CompanyMembership;
  memberName: string;
  onPermissionChange: (key: string, value: boolean) => void;
}

const MOD_CATEGORIES = [
  { label: "Students", icon: GraduationCap, keys: { add: "mod_students_add", edit: "mod_students_edit", delete: "mod_students_delete" } },
  { label: "Payments", icon: CreditCard, keys: { add: "mod_payments_add", edit: "mod_payments_edit", delete: "mod_payments_delete" } },
  { label: "Batches", icon: Layers, keys: { add: "mod_batches_add", edit: "mod_batches_edit", delete: "mod_batches_delete" } },
  { label: "Revenue", icon: TrendingUp, keys: { add: "mod_revenue_add", edit: "mod_revenue_edit", delete: "mod_revenue_delete" } },
  { label: "Expenses", icon: Receipt, keys: { add: "mod_expenses_add", edit: "mod_expenses_edit", delete: "mod_expenses_delete" } },
] as const;

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
  if (member.role === "moderator") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Moderator Permissions</DialogTitle>
            <DialogDescription>
              Configure granular permissions for <strong>{memberName}</strong>. Moderators can view all data but can only modify what you enable below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
              <div>Category</div>
              <div className="text-center">Add</div>
              <div className="text-center">Edit</div>
              <div className="text-center">Delete</div>
            </div>
            {/* Category rows */}
            {MOD_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.label} className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center rounded-lg border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                  {(["add", "edit", "delete"] as const).map((action) => (
                    <div key={action} className="flex justify-center">
                      <Checkbox
                        checked={member[cat.keys[action] as keyof CompanyMembership] as boolean}
                        onCheckedChange={(checked) => onPermissionChange(cat.keys[action], !!checked)}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {/* Transfer toggle */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 mt-2">
            <Label className="text-sm font-medium">Can Transfer Between Accounts</Label>
            <Switch
              checked={member.can_transfer}
              onCheckedChange={(v) => onPermissionChange("can_transfer", v)}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (member.role === "data_entry_operator") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Data Entry Operator Permissions</DialogTitle>
            <DialogDescription>
              Configure access for <strong>{memberName}</strong>. When enabled, the operator can add/edit/delete their own entries only.
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

  return null;
}
