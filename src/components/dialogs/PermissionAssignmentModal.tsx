import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, CreditCard, Layers, TrendingUp, Receipt, BookOpen, Database, Shield } from "lucide-react";
import type { CompanyMembership } from "@/contexts/CompanyContext";

interface PermissionAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CompanyMembership;
  memberName: string;
  onPermissionChange: (key: string, value: boolean) => void;
}

/* ── Data Entry Mode categories ── */
const DEO_CATEGORIES = [
  { key: "deo_students", label: "Add Students", description: "Create new student records", icon: GraduationCap },
  { key: "deo_payments", label: "Record Payments", description: "Record student payments", icon: CreditCard },
  { key: "deo_batches", label: "Add Batches", description: "Create new batches", icon: Layers },
  { key: "deo_courses", label: "Add Courses", description: "Create new courses", icon: BookOpen },
  { key: "deo_finance", label: "Add Revenue & Expenses", description: "Record revenue and expense entries", icon: TrendingUp },
] as const;

/* ── Traditional Moderator permission categories ── */
const MOD_CATEGORIES = [
  {
    label: "Students",
    icon: GraduationCap,
    permissions: [
      { key: "mod_students_add", label: "Add" },
      { key: "mod_students_edit", label: "Edit" },
      { key: "mod_students_delete", label: "Delete" },
    ],
  },
  {
    label: "Payments",
    icon: CreditCard,
    permissions: [
      { key: "mod_payments_add", label: "Add" },
      { key: "mod_payments_edit", label: "Edit" },
      { key: "mod_payments_delete", label: "Delete" },
    ],
  },
  {
    label: "Batches",
    icon: Layers,
    permissions: [
      { key: "mod_batches_add", label: "Add" },
      { key: "mod_batches_edit", label: "Edit" },
      { key: "mod_batches_delete", label: "Delete" },
    ],
  },
  {
    label: "Courses",
    icon: BookOpen,
    permissions: [
      { key: "mod_courses_add", label: "Add" },
      { key: "mod_courses_edit", label: "Edit" },
      { key: "mod_courses_delete", label: "Delete" },
    ],
  },
  {
    label: "Revenue",
    icon: TrendingUp,
    permissions: [
      { key: "mod_revenue_add", label: "Add" },
      { key: "mod_revenue_edit", label: "Edit" },
      { key: "mod_revenue_delete", label: "Delete" },
    ],
  },
  {
    label: "Expenses",
    icon: Receipt,
    permissions: [
      { key: "mod_expenses_add", label: "Add" },
      { key: "mod_expenses_edit", label: "Edit" },
      { key: "mod_expenses_delete", label: "Delete" },
    ],
  },
] as const;

export function PermissionAssignmentModal({
  open,
  onOpenChange,
  member,
  memberName,
  onPermissionChange,
}: PermissionAssignmentModalProps) {
  if (member.role !== "moderator") return null;

  const isDataEntryMode = member.data_entry_mode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Moderator Permissions
          </DialogTitle>
          <DialogDescription>
            Configure access for <strong>{memberName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Data Entry Mode Toggle */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data-entry-mode" className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Entry Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Restrict to data entry only — can add records but cannot see company-wide financial data
              </p>
            </div>
            <Switch
              id="data-entry-mode"
              checked={isDataEntryMode}
              onCheckedChange={(v) => onPermissionChange("data_entry_mode", v)}
            />
          </div>

          {isDataEntryMode && (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
              Data Entry Moderator
            </Badge>
          )}
          {!isDataEntryMode && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Full Moderator
            </Badge>
          )}
        </div>

        <Separator />

        {/* Data Entry Mode: Simple category checkboxes */}
        {isDataEntryMode && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">What they can add:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEO_CATEGORIES.map((cat) => {
                const isOn = member[cat.key as keyof CompanyMembership] as boolean;
                const Icon = cat.icon;
                return (
                  <Card key={cat.key} className={`border transition-colors cursor-pointer ${isOn ? "border-primary/40 bg-primary/5" : ""}`}
                    onClick={() => onPermissionChange(cat.key, !isOn)}>
                    <CardContent className="flex items-start gap-3 p-3">
                      <div className={`mt-0.5 rounded-lg p-1.5 ${isOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium cursor-pointer">{cat.label}</Label>
                          <Checkbox checked={isOn} onCheckedChange={(v) => onPermissionChange(cat.key, !!v)} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Data entry moderators can only edit/delete entries they personally created. They can view all students and batches for reference.
            </p>
          </div>
        )}

        {/* Traditional Moderator: Full permission grid */}
        {!isDataEntryMode && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Permissions per category:</p>
            <div className="space-y-2">
              {MOD_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const anyEnabled = cat.permissions.some(
                  (p) => member[p.key as keyof CompanyMembership] as boolean
                );
                return (
                  <Card key={cat.label} className={`border transition-colors ${anyEnabled ? "border-primary/30 bg-primary/5" : ""}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-4 w-4 ${anyEnabled ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-semibold">{cat.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {cat.permissions.map((perm) => {
                          const isOn = member[perm.key as keyof CompanyMembership] as boolean;
                          return (
                            <div key={perm.key} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`${member.id}-${perm.key}`}
                                checked={isOn}
                                onCheckedChange={(v) => onPermissionChange(perm.key, !!v)}
                              />
                              <Label htmlFor={`${member.id}-${perm.key}`} className="text-xs cursor-pointer">
                                {perm.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Full moderators can view all data, analytics, and reports. Permissions control what actions they can perform.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
