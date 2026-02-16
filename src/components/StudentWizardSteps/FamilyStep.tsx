import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { SiblingInput } from "@/hooks/useStudentSiblings";

export interface FamilyData {
  father_name: string;
  father_occupation: string;
  father_contact: string;
  father_annual_income: string;
  mother_name: string;
  mother_occupation: string;
  mother_contact: string;
  guardian_name: string;
  guardian_contact: string;
  guardian_relationship: string;
  siblings: SiblingInput[];
}

interface Props {
  data: FamilyData;
  onChange: (data: FamilyData) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export default function FamilyStep({ data, onChange, errors, disabled }: Props) {
  const update = (partial: Partial<FamilyData>) => onChange({ ...data, ...partial });

  const addSibling = () => {
    update({ siblings: [...data.siblings, { name: "", age: null, occupation_school: "", contact: "" }] });
  };

  const removeSibling = (index: number) => {
    update({ siblings: data.siblings.filter((_, i) => i !== index) });
  };

  const updateSibling = (index: number, partial: Partial<SiblingInput>) => {
    const updated = data.siblings.map((s, i) => i === index ? { ...s, ...partial } : s);
    update({ siblings: updated });
  };

  return (
    <div className="space-y-5">
      {/* Father */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Father&apos;s Information</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Father&apos;s Name <span className="text-destructive">*</span></Label>
            <Input value={data.father_name} onChange={(e) => update({ father_name: e.target.value })} disabled={disabled} />
            {errors.father_name && <p className="text-sm text-destructive">{errors.father_name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Occupation</Label>
            <Input value={data.father_occupation} onChange={(e) => update({ father_occupation: e.target.value })} disabled={disabled} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input value={data.father_contact} onChange={(e) => update({ father_contact: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Annual Income</Label>
            <Input type="number" value={data.father_annual_income} onChange={(e) => update({ father_annual_income: e.target.value })} disabled={disabled} placeholder="Optional" />
          </div>
        </div>
      </div>

      {/* Mother */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mother&apos;s Information</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Mother&apos;s Name <span className="text-destructive">*</span></Label>
            <Input value={data.mother_name} onChange={(e) => update({ mother_name: e.target.value })} disabled={disabled} />
            {errors.mother_name && <p className="text-sm text-destructive">{errors.mother_name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Occupation</Label>
            <Input value={data.mother_occupation} onChange={(e) => update({ mother_occupation: e.target.value })} disabled={disabled} />
          </div>
        </div>
        <div className="space-y-2 sm:w-1/2">
          <Label>Contact Number</Label>
          <Input value={data.mother_contact} onChange={(e) => update({ mother_contact: e.target.value })} disabled={disabled} />
        </div>
      </div>

      {/* Guardian */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Guardian (if different)</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={data.guardian_name} onChange={(e) => update({ guardian_name: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Contact</Label>
            <Input value={data.guardian_contact} onChange={(e) => update({ guardian_contact: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Relationship</Label>
            <Input value={data.guardian_relationship} onChange={(e) => update({ guardian_relationship: e.target.value })} disabled={disabled} placeholder="e.g. Uncle" />
          </div>
        </div>
      </div>

      {/* Siblings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Siblings ({data.siblings.length})
          </h4>
          <Button type="button" variant="outline" size="sm" onClick={addSibling} disabled={disabled}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Sibling
          </Button>
        </div>
        {data.siblings.map((sib, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border p-3">
            <div className="grid flex-1 gap-2 sm:grid-cols-4">
              <Input placeholder="Name" value={sib.name} onChange={(e) => updateSibling(i, { name: e.target.value })} disabled={disabled} />
              <Input placeholder="Age" type="number" value={sib.age ?? ""} onChange={(e) => updateSibling(i, { age: e.target.value ? Number(e.target.value) : null })} disabled={disabled} />
              <Input placeholder="School/Occupation" value={sib.occupation_school || ""} onChange={(e) => updateSibling(i, { occupation_school: e.target.value })} disabled={disabled} />
              <Input placeholder="Contact" value={sib.contact || ""} onChange={(e) => updateSibling(i, { contact: e.target.value })} disabled={disabled} />
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeSibling(i)} disabled={disabled}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
