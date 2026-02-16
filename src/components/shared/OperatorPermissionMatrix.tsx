import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, CreditCard, Layers, TrendingUp } from "lucide-react";
import type { CompanyMembership } from "@/contexts/CompanyContext";

interface CategoryToggle {
  key: keyof CompanyMembership;
  label: string;
  description: string;
  icon: React.ElementType;
}

const CATEGORIES: CategoryToggle[] = [
  {
    key: "deo_students",
    label: "Student Management",
    description: "Add, edit, and delete students they created",
    icon: GraduationCap,
  },
  {
    key: "deo_payments",
    label: "Payment Recording",
    description: "Record, edit, and delete payments they entered",
    icon: CreditCard,
  },
  {
    key: "deo_batches",
    label: "Batch Management",
    description: "Create, edit, and delete batches they created",
    icon: Layers,
  },
  {
    key: "deo_finance",
    label: "Revenue & Expenses",
    description: "Add, edit, and delete revenue/expense entries they created",
    icon: TrendingUp,
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
      <p className="text-xs text-muted-foreground">
        When enabled, the operator can add/edit/delete their own entries in each category. They cannot see other users' data.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const isOn = member[cat.key] as boolean;
          return (
            <Card key={cat.key} className={`border transition-colors ${isOn ? "border-primary/40 bg-primary/5" : ""}`}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`mt-0.5 rounded-lg p-2 ${isOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <cat.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`${member.id}-${cat.key}`} className="text-sm font-medium cursor-pointer">
                      {cat.label}
                    </Label>
                    <Switch
                      id={`${member.id}-${cat.key}`}
                      checked={isOn}
                      disabled={disabled}
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
    </div>
  );
}
