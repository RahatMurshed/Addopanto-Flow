import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, CreditCard, Layers, TrendingUp, Receipt, Wallet, ArrowLeftRight } from "lucide-react";
import type { CompanyMembership } from "@/contexts/CompanyContext";

interface PermissionGroup {
  label: string;
  icon: React.ElementType;
  permissions: { key: keyof CompanyMembership; label: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Student Management",
    icon: GraduationCap,
    permissions: [
      { key: "can_add_student", label: "Add Student" },
      { key: "can_edit_student", label: "Edit Student" },
      { key: "can_delete_student", label: "Delete Student" },
    ],
  },
  {
    label: "Payment Management",
    icon: CreditCard,
    permissions: [
      { key: "can_add_payment", label: "Add Payment" },
      { key: "can_edit_payment", label: "Edit Payment" },
      { key: "can_delete_payment", label: "Delete Payment" },
    ],
  },
  {
    label: "Batch Management",
    icon: Layers,
    permissions: [
      { key: "can_add_batch", label: "Add Batch" },
      { key: "can_edit_batch", label: "Edit Batch" },
      { key: "can_delete_batch", label: "Delete Batch" },
    ],
  },
  {
    label: "Revenue Management",
    icon: TrendingUp,
    permissions: [
      { key: "can_add_revenue", label: "Add Revenue" },
      { key: "can_edit_revenue", label: "Edit Revenue" },
      { key: "can_delete_revenue", label: "Delete Revenue" },
    ],
  },
  {
    label: "Expense Management",
    icon: Receipt,
    permissions: [
      { key: "can_add_expense", label: "Add Expense" },
      { key: "can_edit_expense", label: "Edit Expense" },
      { key: "can_delete_expense", label: "Delete Expense" },
    ],
  },
  {
    label: "Other",
    icon: Wallet,
    permissions: [
      { key: "can_add_expense_source", label: "Add Expense Source" },
      { key: "can_transfer", label: "Transfer Between Accounts" },
      { key: "can_view_reports", label: "View Reports" },
      { key: "can_manage_students", label: "Manage Students" },
    ],
  },
];

interface OperatorPermissionMatrixProps {
  member: CompanyMembership;
  disabled?: boolean;
  onPermissionChange: (key: string, value: boolean) => void;
}

export function OperatorPermissionMatrix({ member, disabled = false, onPermissionChange }: OperatorPermissionMatrixProps) {
  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm font-medium text-muted-foreground">Data Entry Operator Permissions</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PERMISSION_GROUPS.map((group) => (
          <Card key={group.label} className="border">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center gap-2">
                <group.icon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {group.permissions.map((perm) => (
                <div key={perm.key} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`${member.id}-${perm.key}`} className="text-sm cursor-pointer">
                    {perm.label}
                  </Label>
                  <Switch
                    id={`${member.id}-${perm.key}`}
                    checked={member[perm.key] as boolean}
                    disabled={disabled}
                    onCheckedChange={(v) => onPermissionChange(perm.key, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
