import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";

export interface PersonalData {
  name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  religion_category: string;
  nationality: string;
  aadhar_id_number: string;
}

interface Props {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PersonalStep({ data, onChange, errors, disabled }: Props) {
  const [calOpen, setCalOpen] = useState(false);
  const update = (partial: Partial<PersonalData>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="w-name">Full Name <span className="text-destructive">*</span></Label>
          <Input id="w-name" value={data.name} onChange={(e) => update({ name: e.target.value })} disabled={disabled} placeholder="Student full name" />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label>Date of Birth <span className="text-destructive">*</span></Label>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !data.date_of_birth && "text-muted-foreground")} disabled={disabled}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.date_of_birth ? format(new Date(data.date_of_birth), "PPP") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={data.date_of_birth ? new Date(data.date_of_birth) : undefined}
                onSelect={(d) => { if (d) { update({ date_of_birth: format(d, "yyyy-MM-dd") }); setCalOpen(false); } }}
                captionLayout="dropdown-buttons"
                fromYear={1950}
                toYear={new Date().getFullYear()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.date_of_birth && <p className="text-sm text-destructive">{errors.date_of_birth}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={data.gender || "none"} onValueChange={(v) => update({ gender: v === "none" ? "" : v })} disabled={disabled}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Blood Group</Label>
          <Select value={data.blood_group || "none"} onValueChange={(v) => update({ blood_group: v === "none" ? "" : v })} disabled={disabled}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="w-religion">Religion / Category</Label>
          <Input id="w-religion" value={data.religion_category} onChange={(e) => update({ religion_category: e.target.value })} disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="w-nationality">Nationality</Label>
          <Input id="w-nationality" value={data.nationality} onChange={(e) => update({ nationality: e.target.value })} disabled={disabled} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="w-aadhar">Aadhar / ID Number</Label>
          <Input id="w-aadhar" value={data.aadhar_id_number} onChange={(e) => update({ aadhar_id_number: e.target.value })} disabled={disabled} placeholder="Government ID" />
        </div>
      </div>
    </div>
  );
}
