import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Eye, Search, ClipboardList } from "lucide-react";
import type { AuditLog as AuditLogType } from "@/hooks/useAuditLogs";

const TABLE_OPTIONS = [
  { value: "", label: "All Tables" },
  { value: "students", label: "Students" },
  { value: "student_payments", label: "Student Payments" },
  { value: "batches", label: "Batches" },
  { value: "revenues", label: "Revenues" },
  { value: "expenses", label: "Expenses" },
  { value: "expense_accounts", label: "Expense Sources" },
  { value: "khata_transfers", label: "Transfers" },
];

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
];

const PAGE_SIZE = 25;

function actionBadge(action: string) {
  switch (action) {
    case "INSERT":
      return <Badge variant="secondary" className="text-emerald-600">Created</Badge>;
    case "UPDATE":
      return <Badge variant="secondary" className="text-amber-600">Updated</Badge>;
    case "DELETE":
      return <Badge variant="destructive">Deleted</Badge>;
    default:
      return <Badge variant="secondary">{action}</Badge>;
  }
}

function tableBadge(table: string) {
  const labels: Record<string, string> = {
    students: "Student",
    student_payments: "Payment",
    batches: "Batch",
    revenues: "Revenue",
    expenses: "Expense",
    expense_accounts: "Expense Source",
    khata_transfers: "Transfer",
  };
  return <Badge variant="outline">{labels[table] || table}</Badge>;
}

function getRecordLabel(log: AuditLogType): string {
  const data = log.new_data || log.old_data;
  if (!data) return log.record_id.slice(0, 8);
  if (typeof data.name === "string") return data.name;
  if (typeof data.batch_name === "string") return data.batch_name;
  if (typeof data.description === "string" && (data.description as string).length < 40) return data.description as string;
  return log.record_id.slice(0, 8);
}

export default function AuditLog() {
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher, isLoading: companyLoading } = useCompany();

  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AuditLogType | null>(null);

  useEffect(() => {
    if (!companyLoading && !isCompanyAdmin && !isCipher) {
      navigate("/dashboard", { replace: true });
    }
  }, [companyLoading, isCompanyAdmin, isCipher, navigate]);

  const { data: result, isLoading } = useAuditLogs({
    table_name: tableFilter,
    action: actionFilter,
    user_email: emailSearch,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const logs = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Track all data changes across your business</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user email..."
                value={emailSearch}
                onChange={(e) => { setEmailSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Tables" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {totalCount} {totalCount === 1 ? "entry" : "entries"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-40" />
              <p>No audit entries found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Date & Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[180px]">
                          {log.user_email || log.user_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{actionBadge(log.action)}</TableCell>
                        <TableCell>{tableBadge(log.table_name)}</TableCell>
                        <TableCell className="text-sm truncate max-w-[140px]">
                          {getRecordLabel(log)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setDetail(log)} title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Detail</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Action:</span> {actionBadge(detail.action)}</div>
                <div><span className="text-muted-foreground">Table:</span> {tableBadge(detail.table_name)}</div>
                <div><span className="text-muted-foreground">User:</span> {detail.user_email || detail.user_id.slice(0, 8)}</div>
                <div><span className="text-muted-foreground">Date:</span> {format(new Date(detail.created_at), "MMM dd, yyyy HH:mm:ss")}</div>
              </div>
              <div className="space-y-2">
                {detail.action !== "INSERT" && detail.old_data && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Previous Data</p>
                    <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3">
                      <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(detail.old_data, null, 2)}</pre>
                    </ScrollArea>
                  </div>
                )}
                {detail.action !== "DELETE" && detail.new_data && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">
                      {detail.action === "INSERT" ? "Created Data" : "Updated Data"}
                    </p>
                    <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3">
                      <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(detail.new_data, null, 2)}</pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
