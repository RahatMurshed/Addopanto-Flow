import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateEmployee, useUpdateEmployee, useNextEmployeeId, type Employee, type EmployeeInsert } from "@/hooks/useEmployees";
import { toast } from "sonner";

const DESIGNATIONS = ["Teacher", "Manager", "Accountant", "Receptionist", "IT Staff"];
const DEPARTMENTS = ["Academic", "Administration", "Finance", "Operations"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

export function EmployeeDialog({ open, onOpenChange, employee }: Props) {
  const isEditing = !!employee;
  const { data: nextId } = useNextEmployeeId();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const [form, setForm] = useState<Partial<EmployeeInsert>>({});
  const [customDesignation, setCustomDesignation] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [useCustomDesignation, setUseCustomDesignation] = useState(false);
  const [useCustomDepartment, setUseCustomDepartment] = useState(false);

  useEffect(() => {
    if (open) {
      if (employee) {
        setForm({ ...employee });
        const isCustomD = employee.designation && !DESIGNATIONS.includes(employee.designation);
        setUseCustomDesignation(!!isCustomD);
        if (isCustomD) setCustomDesignation(employee.designation || "");
        const isCustomDept = employee.department && !DEPARTMENTS.includes(employee.department);
        setUseCustomDepartment(!!isCustomDept);
        if (isCustomDept) setCustomDepartment(employee.department || "");
      } else {
        setForm({ employee_id_number: nextId || "EMP-001", employment_type: "full_time", employment_status: "active", monthly_salary: 0, permanent_address_same: true });
        setCustomDesignation("");
        setCustomDepartment("");
        setUseCustomDesignation(false);
        setUseCustomDepartment(false);
      }
    }
  }, [open, employee, nextId]);

  const set = (key: keyof EmployeeInsert, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.full_name?.trim()) { toast.error("Full name is required"); return; }
    if (!form.contact_number?.trim()) { toast.error("Contact number is required"); return; }
    if (!form.join_date) { toast.error("Join date is required"); return; }
    if (!form.employee_id_number?.trim()) { toast.error("Employee ID is required"); return; }

    const finalDesignation = useCustomDesignation ? customDesignation : form.designation;
    const finalDepartment = useCustomDepartment ? customDepartment : form.department;
    const payload = { ...form, designation: finalDesignation, department: finalDepartment };
    if (payload.permanent_address_same) {
      payload.permanent_address = payload.current_address;
    }

    try {
      if (isEditing && employee) {
        await updateEmployee.mutateAsync({ id: employee.id, ...payload });
        toast.success("Employee updated");
      } else {
        await createEmployee.mutateAsync(payload as EmployeeInsert);
        toast.success("Employee added");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save employee");
    }
  };

  const loading = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee ID *</Label>
                  <Input value={form.employee_id_number || ""} onChange={e => set("employee_id_number", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={form.full_name || ""} onChange={e => set("full_name", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Designation</Label>
                  {useCustomDesignation ? (
                    <div className="flex gap-2">
                      <Input value={customDesignation} onChange={e => setCustomDesignation(e.target.value)} placeholder="Custom designation" />
                      <Button variant="ghost" size="sm" onClick={() => setUseCustomDesignation(false)}>List</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select value={form.designation || ""} onValueChange={v => set("designation", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => setUseCustomDesignation(true)}>Custom</Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  {useCustomDepartment ? (
                    <div className="flex gap-2">
                      <Input value={customDepartment} onChange={e => setCustomDepartment(e.target.value)} placeholder="Custom department" />
                      <Button variant="ghost" size="sm" onClick={() => setUseCustomDepartment(false)}>List</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select value={form.department || ""} onValueChange={v => set("department", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => setUseCustomDepartment(true)}>Custom</Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.date_of_birth || ""} onChange={e => set("date_of_birth", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.gender || ""} onValueChange={v => set("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select value={form.blood_group || ""} onValueChange={v => set("blood_group", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Number *</Label>
                  <Input value={form.contact_number || ""} onChange={e => set("contact_number", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input value={form.whatsapp_number || ""} onChange={e => set("whatsapp_number", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Current Address</Label>
                <Textarea value={form.current_address || ""} onChange={e => set("current_address", e.target.value)} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.permanent_address_same ?? true} onCheckedChange={v => set("permanent_address_same", v)} />
                <Label>Permanent address same as current</Label>
              </div>
              {!form.permanent_address_same && (
                <div className="space-y-2">
                  <Label>Permanent Address</Label>
                  <Textarea value={form.permanent_address || ""} onChange={e => set("permanent_address", e.target.value)} rows={2} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emergency Contact Name</Label>
                  <Input value={form.emergency_contact_name || ""} onChange={e => set("emergency_contact_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact Number</Label>
                  <Input value={form.emergency_contact_number || ""} onChange={e => set("emergency_contact_number", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Employment */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Employment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Join Date *</Label>
                  <Input type="date" value={form.join_date || ""} onChange={e => set("join_date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select value={form.employment_type || "full_time"} onValueChange={v => set("employment_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Status</Label>
                  <Select value={form.employment_status || "active"} onValueChange={v => set("employment_status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Salary</Label>
                  <Input type="number" min={0} value={form.monthly_salary ?? 0} onChange={e => set("monthly_salary", parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            {/* Financial */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Financial Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bank Account Number</Label>
                  <Input value={form.bank_account_number || ""} onChange={e => set("bank_account_number", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={form.bank_name || ""} onChange={e => set("bank_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bank Branch</Label>
                  <Input value={form.bank_branch || ""} onChange={e => set("bank_branch", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Aadhar / National ID</Label>
                <Input value={form.aadhar_national_id || ""} onChange={e => set("aadhar_national_id", e.target.value)} />
              </div>
            </div>

            {/* Additional */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Additional Information</h3>
              <div className="space-y-2">
                <Label>Previous Experience</Label>
                <Textarea value={form.previous_experience || ""} onChange={e => set("previous_experience", e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Qualifications</Label>
                <Textarea value={form.qualifications || ""} onChange={e => set("qualifications", e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : isEditing ? "Update" : "Add Employee"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
