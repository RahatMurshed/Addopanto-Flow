import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GraduationCap, CreditCard, TrendingUp, Receipt, Database, Shield, Briefcase, Eye } from "lucide-react";
import type { CompanyMembership } from "@/contexts/CompanyContext";

interface PermissionAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: CompanyMembership;
  memberName: string;
  onPermissionChange: (key: string, value: boolean) => void;
}

/* ── Data Entry Mode categories (minimal: only Students and Expenses) ── */
const DEO_CATEGORIES = [
  { key: "deo_students", label: "Add Students", description: "Create new student records", icon: GraduationCap },
  { key: "deo_finance", label: "Add Expenses", description: "Record expense entries", icon: Receipt },
] as const;

/* ── Section definitions for traditional moderator ── */
interface PermToggle {
  key: string;
  label: string;
  description: string;
  isView?: boolean;
  requiresView?: string; // key of the view toggle it depends on
}

interface PermSection {
  label: string;
  description: string;
  icon: any;
  permissions: PermToggle[];
}

const MOD_SECTIONS: PermSection[] = [
  {
    label: "Students",
    description: "Control what this moderator can do with student records.",
    icon: GraduationCap,
    permissions: [
      { key: "mod_students_add", label: "Add Students", description: "Can create new student records" },
      { key: "mod_students_edit", label: "Edit Students", description: "Can edit existing student information" },
      { key: "mod_students_delete", label: "Delete Students", description: "Can permanently delete student records" },
    ],
  },
  {
    label: "Payments",
    description: "If you turn on any payment permission, this moderator can also see the Courses and Batches pages.",
    icon: CreditCard,
    permissions: [
      { key: "mod_payments_add", label: "Add Payments", description: "Can record new student payments" },
      { key: "mod_payments_edit", label: "Edit Payments", description: "Can edit existing payment records" },
      { key: "mod_payments_delete", label: "Delete Payments", description: "Can delete payment records" },
    ],
  },
  {
    label: "Revenue",
    description: "If you turn on View Revenue, this moderator can see the full Revenue page including all entries from all users.",
    icon: TrendingUp,
    permissions: [
      { key: "mod_view_revenue", label: "View Revenue", description: "Can see the Revenue page (all entries)", isView: true },
      { key: "mod_revenue_add", label: "Add Revenue", description: "Can create new revenue entries", requiresView: "mod_view_revenue" },
      { key: "mod_revenue_edit", label: "Edit Revenue", description: "Can edit existing revenue entries", requiresView: "mod_view_revenue" },
      { key: "mod_revenue_delete", label: "Delete Revenue", description: "Can delete revenue entries", requiresView: "mod_view_revenue" },
    ],
  },
  {
    label: "Expenses",
    description: "If you turn on View Expenses, this moderator can see the full Expenses page including all entries from all users.",
    icon: Receipt,
    permissions: [
      { key: "mod_view_expenses", label: "View Expenses", description: "Can see the Expenses page (all entries)", isView: true },
      { key: "mod_expenses_add", label: "Add Expenses", description: "Can create new expense entries", requiresView: "mod_view_expenses" },
      { key: "mod_expenses_edit", label: "Edit Expenses", description: "Can edit existing expense entries", requiresView: "mod_view_expenses" },
      { key: "mod_expenses_delete", label: "Delete Expenses", description: "Can delete expense entries", requiresView: "mod_view_expenses" },
    ],
  },
  {
    label: "Employees",
    description: "If you turn on View Employees, this moderator can see the Employees page. Turn on individual actions to grant write access.",
    icon: Briefcase,
    permissions: [
      { key: "mod_view_employees", label: "View Employees", description: "Can see the Employees page", isView: true },
      { key: "mod_employees_add", label: "Add Employees", description: "Can add new employee records", requiresView: "mod_view_employees" },
      { key: "mod_employees_edit", label: "Edit Employees", description: "Can edit employee information", requiresView: "mod_view_employees" },
      { key: "mod_employees_delete", label: "Delete Employees", description: "Can delete employee records", requiresView: "mod_view_employees" },
      { key: "mod_employees_salary", label: "Manage Salary", description: "Can record, edit, and delete employee salary payments", requiresView: "mod_view_employees" },
    ],
  },
];

export function PermissionAssignmentModal({
  open,
  onOpenChange,
  member,
  memberName,
  onPermissionChange,
}: PermissionAssignmentModalProps) {
  if (member.role !== "moderator") return null;

  const isDataEntryMode = member.data_entry_mode;

  const getVal = (key: string): boolean => (member as any)[key] ?? false;

  /** Handle view toggle off → auto-disable dependent write toggles */
  const handleViewToggleOff = (section: PermSection, viewKey: string) => {
    onPermissionChange(viewKey, false);
    section.permissions
      .filter(p => p.requiresView === viewKey)
      .forEach(p => {
        if (getVal(p.key)) onPermissionChange(p.key, false);
      });
  };

  /** Handle write toggle on → auto-enable view if not already on */
  const handleWriteToggleOn = (perm: PermToggle) => {
    if (perm.requiresView && !getVal(perm.requiresView)) {
      onPermissionChange(perm.requiresView, true);
    }
    onPermissionChange(perm.key, true);
  };

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
              Data entry moderators can only add students and expenses. Dashboard, Reports, Courses, Batches, Payments, and Revenue are blocked.
            </p>
          </div>
        )}

        {/* Traditional Moderator: Sectioned permissions */}
        {!isDataEntryMode && (
          <TooltipProvider>
            <div className="space-y-4">
              {MOD_SECTIONS.map((section) => {
                const Icon = section.icon;
                const anyEnabled = section.permissions.some(p => getVal(p.key));
                return (
                  <Card key={section.label} className={`border transition-colors ${anyEnabled ? "border-primary/30 bg-primary/5" : ""}`}>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${anyEnabled ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="text-sm font-semibold">{section.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                      <div className="space-y-2">
                        {section.permissions.map((perm) => {
                          const isOn = getVal(perm.key);
                          const viewKey = perm.requiresView;
                          const viewIsOff = viewKey ? !getVal(viewKey) : false;
                          const isDisabled = viewIsOff && !perm.isView;

                          const toggle = (
                            <div
                              key={perm.key}
                              className={`flex items-center justify-between rounded-md px-3 py-2 ${
                                isDisabled ? "opacity-50" : isOn ? "bg-primary/5" : "hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {perm.isView && <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                <div>
                                  <Label className={`text-sm font-medium ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                    {perm.label}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                                </div>
                              </div>
                              <Switch
                                checked={isOn}
                                disabled={isDisabled}
                                onCheckedChange={(v) => {
                                  if (perm.isView && !v) {
                                    handleViewToggleOff(section, perm.key);
                                  } else if (!perm.isView && v) {
                                    handleWriteToggleOn(perm);
                                  } else {
                                    onPermissionChange(perm.key, v);
                                  }
                                }}
                              />
                            </div>
                          );

                          if (isDisabled) {
                            return (
                              <Tooltip key={perm.key}>
                                <TooltipTrigger asChild>{toggle}</TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Enable the View permission first</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }

                          return toggle;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <p className="text-xs text-muted-foreground italic">
                Full moderators can access pages and perform actions only when specific permissions are granted. Dashboard and Reports remain admin-only.
              </p>
            </div>
          </TooltipProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}