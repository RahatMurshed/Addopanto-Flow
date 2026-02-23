import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeDialog } from "@/components/dialogs/EmployeeDialog";
import {
  useEmployee, useEmployeeSalaryPayments, useCreateSalaryPayment, useDeleteSalaryPayment,
  useEmployeeAttendance, useMarkAttendance,
  useEmployeeLeaves, useCreateLeave, useDeleteLeave,
} from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { ArrowLeft, Pencil, Calendar, DollarSign, Clock, FileText, Trash2, Download, Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import jsPDF from "jspdf";
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths } from "date-fns";
import { toast } from "sonner";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  on_leave: { label: "On Leave", variant: "outline" },
};

const TYPE_LABELS: Record<string, string> = { full_time: "Full-time", part_time: "Part-time", contract: "Contract" };
const ATTENDANCE_COLORS: Record<string, string> = { present: "bg-success/20 text-success", absent: "bg-destructive/20 text-destructive", half_day: "bg-warning/20 text-warning", leave: "bg-primary/20 text-primary" };

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManageEmployees, isCipher } = useCompany();
  const { fc: formatAmount } = useCompanyCurrency();
  const canManage = canManageEmployees;

  const { data: employee, isLoading } = useEmployee(id);
  const [editOpen, setEditOpen] = useState(false);
  const [showSalary, setShowSalary] = useState(isCipher);
  const salaryVisible = isCipher || showSalary;

  // Salary
  const { data: salaryPayments = [] } = useEmployeeSalaryPayments(id);
  const createSalary = useCreateSalaryPayment();
  const deleteSalary = useDeleteSalaryPayment();
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [salaryForm, setSalaryForm] = useState({ month: format(new Date(), "yyyy-MM"), payment_date: format(new Date(), "yyyy-MM-dd"), payment_method: "cash", deductions: 0, description: "" });

  // Attendance
  const [attendanceMonth, setAttendanceMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: attendance = [] } = useEmployeeAttendance(id, attendanceMonth);
  const markAttendance = useMarkAttendance();

  // Leaves
  const { data: leaves = [] } = useEmployeeLeaves(id);
  const createLeave = useCreateLeave();
  const deleteLeave = useDeleteLeave();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: "casual", start_date: "", end_date: "", reason: "" });

  const handlePaySalary = async () => {
    if (!id || !employee) return;
    const amount = employee.monthly_salary;
    const deductions = salaryForm.deductions || 0;
    try {
      await createSalary.mutateAsync({
        employee_id: id, amount, month: salaryForm.month,
        payment_date: salaryForm.payment_date, payment_method: salaryForm.payment_method,
        deductions, net_amount: amount - deductions, description: salaryForm.description || undefined,
      });
      toast.success("Salary payment recorded");
      setSalaryDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleMarkAttendance = async (date: string, status: string) => {
    if (!id) return;
    try {
      await markAttendance.mutateAsync({ employee_id: id, date, status });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddLeave = async () => {
    if (!id) return;
    if (!leaveForm.start_date || !leaveForm.end_date) { toast.error("Start and end dates required"); return; }
    try {
      await createLeave.mutateAsync({ employee_id: id, ...leaveForm });
      toast.success("Leave recorded");
      setLeaveDialogOpen(false);
      setLeaveForm({ leave_type: "casual", start_date: "", end_date: "", reason: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDownloadSalarySlip = (sp: { month: string; amount: number; deductions: number; net_amount: number; payment_date: string; payment_method: string }) => {
    if (!employee) return;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const w = 210;
    let y = 20;
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("SALARY SLIP", w / 2, y, { align: "center" });
    y += 10;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Month: ${sp.month}`, w / 2, y, { align: "center" });
    y += 12;
    pdf.setDrawColor(200);
    pdf.line(20, y, w - 20, y);
    y += 8;
    const addRow = (label: string, value: string) => {
      pdf.setFont("helvetica", "normal");
      pdf.text(label, 25, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(value, 120, y);
      y += 7;
    };
    addRow("Employee Name:", employee.full_name);
    addRow("Employee ID:", employee.employee_id_number);
    addRow("Designation:", employee.designation || "N/A");
    addRow("Department:", employee.department || "N/A");
    y += 5;
    pdf.line(20, y, w - 20, y);
    y += 8;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Earnings & Deductions", 25, y);
    y += 10;
    pdf.setFontSize(10);
    addRow("Gross Salary:", formatAmount(sp.amount));
    addRow("Deductions:", formatAmount(sp.deductions));
    y += 3;
    pdf.line(20, y, w - 20, y);
    y += 8;
    pdf.setFontSize(12);
    addRow("Net Payable:", formatAmount(sp.net_amount));
    y += 5;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    addRow("Payment Date:", format(new Date(sp.payment_date), "dd MMM yyyy"));
    addRow("Payment Method:", sp.payment_method.replace("_", " ").toUpperCase());
    y += 10;
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}`, w / 2, y, { align: "center" });
    pdf.save(`salary_slip_${employee.employee_id_number}_${sp.month}.pdf`);
    toast.success("Salary slip downloaded");
  };

  // Attendance calendar data
  const daysInMonth = getDaysInMonth(new Date(attendanceMonth + "-01"));
  const attendanceMap = useMemo(() => {
    const map: Record<string, string> = {};
    attendance.forEach(a => { map[a.date] = a.status; });
    return map;
  }, [attendance]);

  const attendanceStats = useMemo(() => {
    const present = attendance.filter(a => a.status === "present").length;
    const absent = attendance.filter(a => a.status === "absent").length;
    const halfDay = attendance.filter(a => a.status === "half_day").length;
    const leave = attendance.filter(a => a.status === "leave").length;
    const total = present + absent + halfDay + leave;
    return { present, absent, halfDay, leave, percentage: total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0 };
  }, [attendance]);

  // Salary summary
  const paidMonths = useMemo(() => new Set(salaryPayments.map(s => s.month)), [salaryPayments]);
  const totalPaid = useMemo(() => salaryPayments.reduce((s, p) => s + p.net_amount, 0), [salaryPayments]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!employee) {
    return <div className="text-center py-20 text-muted-foreground">Employee not found</div>;
  }

  const initials = employee.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const badge = STATUS_BADGES[employee.employment_status] || STATUS_BADGES.active;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/employees")} className="gap-2 mb-2">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={employee.profile_picture_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{employee.full_name}</h1>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="text-muted-foreground">{employee.employee_id_number} • {employee.designation || "No designation"} • {employee.department || "No department"}</p>
              <p className="text-sm text-muted-foreground mt-1">{TYPE_LABELS[employee.employment_type] || employee.employment_type} • Joined {format(new Date(employee.join_date), "dd MMM yyyy")}</p>
            </div>
            <div className="flex items-center gap-2">
              {canManage && !isCipher && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setShowSalary(s => !s)}>
                        {showSalary ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{showSalary ? "Hide Salary" : "Show Salary"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canManage && (
                <Button onClick={() => setEditOpen(true)} variant="outline" className="gap-2">
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-1"><FileText className="h-3 w-3 hidden sm:inline" /> Profile</TabsTrigger>
          {salaryVisible && <TabsTrigger value="salary" className="gap-1"><DollarSign className="h-3 w-3 hidden sm:inline" /> Salary</TabsTrigger>}
          <TabsTrigger value="attendance" className="gap-1"><Calendar className="h-3 w-3 hidden sm:inline" /> Attendance</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1"><Clock className="h-3 w-3 hidden sm:inline" /> Leaves</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), "dd MMM yyyy") : null} />
                <InfoRow label="Gender" value={employee.gender} />
                <InfoRow label="Blood Group" value={employee.blood_group} />
                <InfoRow label="Aadhar/National ID" value={employee.aadhar_national_id} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Contact Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Phone" value={employee.contact_number} />
                <InfoRow label="WhatsApp" value={employee.whatsapp_number} />
                <InfoRow label="Email" value={employee.email} />
                <InfoRow label="Emergency Contact" value={employee.emergency_contact_name ? `${employee.emergency_contact_name} (${employee.emergency_contact_number || "N/A"})` : null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Address</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Current" value={employee.current_address} />
                <InfoRow label="Permanent" value={employee.permanent_address_same ? "Same as current" : employee.permanent_address} />
              </CardContent>
            </Card>
            {salaryVisible && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Financial Information</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="Monthly Salary" value={formatAmount(employee.monthly_salary)} />
                  <InfoRow label="Bank Account" value={employee.bank_account_number} />
                  <InfoRow label="Bank Name" value={employee.bank_name} />
                  <InfoRow label="Branch" value={employee.bank_branch} />
                </CardContent>
              </Card>
            )}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-sm">Additional Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Qualifications" value={employee.qualifications} />
                <InfoRow label="Previous Experience" value={employee.previous_experience} />
                <InfoRow label="Notes" value={employee.notes} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Salary Tab */}
        {salaryVisible && (
          <TabsContent value="salary" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid: <span className="font-bold text-foreground">{formatAmount(totalPaid)}</span></p>
              </div>
              <Button onClick={() => setSalaryDialogOpen(true)} className="gap-2"><DollarSign className="h-4 w-4" /> Record Payment</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No salary payments recorded</TableCell></TableRow>
                    ) : salaryPayments.map(sp => (
                      <TableRow key={sp.id}>
                        <TableCell className="font-medium">{sp.month}</TableCell>
                        <TableCell>{formatAmount(sp.amount)}</TableCell>
                        <TableCell>{formatAmount(sp.deductions)}</TableCell>
                        <TableCell className="font-medium">{formatAmount(sp.net_amount)}</TableCell>
                        <TableCell>{format(new Date(sp.payment_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="capitalize">{sp.payment_method}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadSalarySlip(sp)} title="Download Salary Slip"><Download className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
                                <AlertDialogDescription>Remove this salary payment record?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSalary.mutate({ id: sp.id, employeeId: id! })} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Salary Dialog */}
            <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Salary Payment</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Input type="month" value={salaryForm.month} onChange={e => setSalaryForm(f => ({ ...f, month: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input value={formatAmount(employee.monthly_salary)} disabled />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Date</Label>
                      <Input type="date" value={salaryForm.payment_date} onChange={e => setSalaryForm(f => ({ ...f, payment_date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select value={salaryForm.payment_method} onValueChange={v => setSalaryForm(f => ({ ...f, payment_method: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Deductions</Label>
                    <Input type="number" min={0} value={salaryForm.deductions} onChange={e => setSalaryForm(f => ({ ...f, deductions: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea value={salaryForm.description} onChange={e => setSalaryForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="p-3 rounded-lg bg-muted text-sm">
                    Net Payable: <span className="font-bold text-primary">{formatAmount(employee.monthly_salary - (salaryForm.deductions || 0))}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSalaryDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handlePaySalary} disabled={createSalary.isPending}>{createSalary.isPending ? "Saving..." : "Record Payment"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAttendanceMonth(format(subMonths(new Date(attendanceMonth + "-01"), 1), "yyyy-MM"))}>←</Button>
              <span className="font-medium">{format(new Date(attendanceMonth + "-01"), "MMMM yyyy")}</span>
              <Button variant="outline" size="sm" onClick={() => setAttendanceMonth(format(addMonths(new Date(attendanceMonth + "-01"), 1), "yyyy-MM"))}>→</Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Attendance: <span className="font-bold text-foreground">{attendanceStats.percentage}%</span>
              <span className="ml-3">P:{attendanceStats.present} A:{attendanceStats.absent} H:{attendanceStats.halfDay} L:{attendanceStats.leave}</span>
            </div>
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {(() => {
                  const firstDay = new Date(attendanceMonth + "-01").getDay();
                  const blanks = Array.from({ length: firstDay }, (_, i) => <div key={`b-${i}`} />);
                  const days = Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${attendanceMonth}-${String(day).padStart(2, "0")}`;
                    const status = attendanceMap[dateStr];
                    const colorClass = status ? ATTENDANCE_COLORS[status] || "" : "";

                    return (
                      <div key={day} className="relative">
                        {canManage ? (
                          <Select value={status || ""} onValueChange={v => handleMarkAttendance(dateStr, v)}>
                            <SelectTrigger className={`h-10 text-xs justify-center border-0 ${colorClass}`}>
                              <span>{day}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="half_day">Half Day</SelectItem>
                              <SelectItem value="leave">Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className={`h-10 flex items-center justify-center text-xs rounded ${colorClass}`}>{day}</div>
                        )}
                      </div>
                    );
                  });
                  return [...blanks, ...days];
                })()}
              </div>
              <div className="flex gap-4 mt-4 text-xs">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-success/20" /> Present</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-destructive/20" /> Absent</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-warning/20" /> Half Day</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary/20" /> Leave</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total leaves: <span className="font-bold text-foreground">{leaves.length}</span></p>
            {canManage && <Button onClick={() => setLeaveDialogOpen(true)} className="gap-2"><Clock className="h-4 w-4" /> Add Leave</Button>}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.length === 0 ? (
                    <TableRow><TableCell colSpan={canManage ? 6 : 5} className="text-center py-6 text-muted-foreground">No leave records</TableCell></TableRow>
                  ) : leaves.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="capitalize">{l.leave_type}</TableCell>
                      <TableCell>{format(new Date(l.start_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{format(new Date(l.end_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{l.reason || "—"}</TableCell>
                      <TableCell><Badge variant={l.approval_status === "approved" ? "default" : "secondary"} className="capitalize">{l.approval_status}</Badge></TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteLeave.mutate({ id: l.id, employeeId: id! })}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Leave Dialog */}
          <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Leave</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select value={leaveForm.leave_type} onValueChange={v => setLeaveForm(f => ({ ...f, leave_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddLeave} disabled={createLeave.isPending}>{createLeave.isPending ? "Saving..." : "Add Leave"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      <EmployeeDialog open={editOpen} onOpenChange={setEditOpen} employee={employee} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
