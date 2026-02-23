import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import TablePagination from "@/components/shared/TablePagination";
import { EmployeeDialog } from "@/components/dialogs/EmployeeDialog";
import { useEmployees, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Plus, Search, Eye, Pencil, Trash2, Users, UserCheck, UserX, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  on_leave: { label: "On Leave", variant: "outline" },
};

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};

const CHART_COLORS = ["hsl(30,100%,45%)", "hsl(217,70%,45%)", "hsl(142,76%,36%)", "hsl(0,84%,45%)", "hsl(280,60%,50%)", "hsl(38,92%,50%)"];

export default function Employees() {
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher } = useCompany();
  const { fc: formatAmount } = useCompanyCurrency();
  const canManage = isCompanyAdmin || isCipher;

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [designation, setDesignation] = useState("all");
  const [status, setStatus] = useState("all");
  const [employmentType, setEmploymentType] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { data, isLoading } = useEmployees({ search, department, designation, status, employmentType, page, pageSize: 50 });
  const deleteEmployee = useDeleteEmployee();
  const employees = data?.data || [];
  const totalCount = data?.totalCount || 0;

  // Stats
  const stats = useMemo(() => {
    const active = employees.filter(e => e.employment_status === "active").length;
    const inactive = employees.filter(e => e.employment_status === "inactive").length;
    const onLeave = employees.filter(e => e.employment_status === "on_leave").length;
    const totalSalary = employees.reduce((sum, e) => sum + (e.employment_status === "active" ? e.monthly_salary : 0), 0);

    const deptMap: Record<string, number> = {};
    employees.forEach(e => { const d = e.department || "Unassigned"; deptMap[d] = (deptMap[d] || 0) + 1; });
    const deptChart = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

    return { total: employees.length, active, inactive, onLeave, totalSalary, deptChart };
  }, [employees]);

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success("Employee deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setDialogOpen(true);
  };

  // Unique departments/designations from current data for filters
  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);
  const designations = useMemo(() => [...new Set(employees.map(e => e.designation).filter(Boolean))], [employees]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage your company staff</p>
        </div>
        {canManage && (
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{isLoading ? "—" : stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <UserCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{isLoading ? "—" : stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <UserX className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{isLoading ? "—" : stats.inactive}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{isLoading ? "—" : stats.onLeave}</p>
              <p className="text-xs text-muted-foreground">On Leave</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department chart + Payroll */}
      {canManage && stats.deptChart.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Department Distribution</CardTitle></CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.deptChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`}>
                    {stats.deptChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Payroll</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-48">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{formatAmount(stats.totalSalary)}</p>
                <p className="text-sm text-muted-foreground mt-1">Total active employee salaries</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, ID, phone, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={department} onValueChange={v => { setDepartment(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            <Select value={employmentType} onValueChange={v => { setEmploymentType(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden md:table-cell">Designation</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Join Date</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="hidden md:table-cell">Salary</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: canManage ? 8 : 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
              ) : (
                employees.map(emp => {
                  const initials = emp.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const badge = STATUS_BADGES[emp.employment_status] || STATUS_BADGES.active;
                  return (
                    <TableRow key={emp.id} className="cursor-pointer" onClick={() => navigate(`/employees/${emp.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={emp.profile_picture_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{emp.full_name}</p>
                            <p className="text-xs text-muted-foreground">{emp.employee_id_number}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{emp.designation || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{emp.department || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{emp.contact_number}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{format(new Date(emp.join_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="hidden md:table-cell text-sm font-medium">{formatAmount(emp.monthly_salary)}</TableCell>
                      )}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/employees/${emp.id}`)}><Eye className="h-4 w-4" /></Button>
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete {emp.full_name} and all associated records (salary, attendance, leaves).</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(emp.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {totalCount > 50 && (
            <div className="p-4 border-t">
              <TablePagination
                currentPage={page}
                totalPages={Math.ceil(totalCount / 50)}
                totalItems={totalCount}
                startIndex={(page - 1) * 50}
                endIndex={Math.min(page * 50, totalCount)}
                itemsPerPage={50}
                onPageChange={setPage}
                onItemsPerPageChange={() => {}}
                canGoNext={page * 50 < totalCount}
                canGoPrev={page > 1}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={editingEmployee} />
    </div>
  );
}
