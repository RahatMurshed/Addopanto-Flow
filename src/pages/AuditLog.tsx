import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Search, ClipboardList, Plus, Minus, ArrowRight } from "lucide-react";
import TablePagination from "@/components/TablePagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditLog as AuditLogType } from "@/hooks/useAuditLogs";
import { useEffect } from "react";

/* ── Constants ── */

const TABLE_OPTIONS = [
  { value: "all", label: "All Tables" },
  { value: "students", label: "Students" },
  { value: "student_payments", label: "Payments" },
  { value: "batches", label: "Batches" },
  { value: "revenues", label: "Revenues" },
  { value: "expenses", label: "Expenses" },
  { value: "expense_accounts", label: "Expense Sources" },
  { value: "khata_transfers", label: "Transfers" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
];

const DEFAULT_PAGE_SIZE = 25;

/* ── Helpers ── */

function getActionLabel(table: string, action: string): { label: string; color: string } {
  const map: Record<string, Record<string, string>> = {
    student_payments: { INSERT: "Payment Recorded", UPDATE: "Payment Updated", DELETE: "Payment Deleted" },
    students: { INSERT: "Student Added", UPDATE: "Student Updated", DELETE: "Student Removed" },
    batches: { INSERT: "Batch Created", UPDATE: "Batch Updated", DELETE: "Batch Deleted" },
    revenues: { INSERT: "Revenue Added", UPDATE: "Revenue Updated", DELETE: "Revenue Deleted" },
    expenses: { INSERT: "Expense Added", UPDATE: "Expense Updated", DELETE: "Expense Deleted" },
    expense_accounts: { INSERT: "Source Created", UPDATE: "Source Updated", DELETE: "Source Deleted" },
    khata_transfers: { INSERT: "Transfer Made", UPDATE: "Transfer Updated", DELETE: "Transfer Deleted" },
    courses: { INSERT: "Course Created", UPDATE: "Course Updated", DELETE: "Course Deleted" },
  };
  const label = map[table]?.[action] || `${action}`;
  const color = action === "INSERT" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
    : action === "UPDATE" ? "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400"
    : action === "DELETE" ? "bg-destructive/15 text-destructive border-destructive/20"
    : "bg-muted text-muted-foreground";
  return { label, color };
}

function getEntityName(log: AuditLogType): string {
  const d = log.new_data || log.old_data;
  if (!d) return log.record_id.slice(0, 8);
  if (typeof d.name === "string") return d.name;
  if (typeof d.batch_name === "string") return d.batch_name;
  if (typeof d.course_name === "string") return d.course_name;
  if (typeof d.description === "string" && (d.description as string).length < 50) return d.description as string;
  return log.record_id.slice(0, 8);
}

function getEntityLink(log: AuditLogType): string | null {
  const id = log.record_id;
  switch (log.table_name) {
    case "students": return `/students/${id}`;
    case "batches": return `/batches/${id}`;
    case "courses": return `/courses/${id}`;
    default: return null;
  }
}

function getDescription(log: AuditLogType): string {
  const d = log.new_data || log.old_data;
  if (!d) return "";
  if (log.table_name === "student_payments") {
    const parts: string[] = [];
    if (d.payment_type) parts.push(`Type: ${d.payment_type === "admission" ? "Admission Fee" : "Monthly Fee"}`);
    if (d.amount) parts.push(`Amount: ${d.amount}`);
    if (d.months_covered && Array.isArray(d.months_covered) && (d.months_covered as string[]).length > 0) {
      parts.push(`Months: ${(d.months_covered as string[]).join(", ")}`);
    }
    parts.push("→ Revenue auto-recorded");
    return parts.join(" · ");
  }
  if (log.table_name === "students") {
    const parts: string[] = [];
    if (d.name) parts.push(String(d.name));
    if (d.student_id_number) parts.push(`ID: ${d.student_id_number}`);
    return parts.join(" · ");
  }
  if (log.table_name === "expenses" && d.amount) {
    return `Amount: ${d.amount}${d.description ? ` — ${d.description}` : ""}`;
  }
  if (log.table_name === "khata_transfers" && d.amount) {
    return `Amount: ${d.amount}${d.description ? ` — ${d.description}` : ""}`;
  }
  return "";
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

const HIDDEN_FIELDS = new Set(["id", "user_id", "company_id", "created_at", "updated_at"]);

/* ── Diff View ── */

function DiffView({ oldData, newData }: { oldData: Record<string, unknown>; newData: Record<string, unknown> }) {
  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
  const changed: { key: string; old: unknown; new: unknown }[] = [];

  for (const key of allKeys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.push({ key, old: oldData[key], new: newData[key] });
    }
  }

  const visibleKeys = allKeys.filter(k => !HIDDEN_FIELDS.has(k));

  return (
    <Tabs defaultValue="changes" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="changes" className="flex-1">Changes ({changed.length})</TabsTrigger>
        <TabsTrigger value="all" className="flex-1">All Fields ({visibleKeys.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="changes">
        <ScrollArea className="max-h-80 rounded-md border bg-muted/30 p-3">
          {changed.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No field changes detected</p>
          ) : (
            <div className="space-y-2">
              {changed.map(({ key, old: oldVal, new: newVal }) => (
                <div key={key} className="rounded-md border border-border bg-background p-2">
                  <p className="font-mono text-xs font-medium text-muted-foreground mb-1">{key}</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-2 text-xs rounded px-2 py-1 bg-destructive/10">
                      <Minus className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
                      <span className="break-all">{formatValue(oldVal)}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs rounded px-2 py-1 bg-emerald-500/10">
                      <Plus className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                      <span className="break-all">{formatValue(newVal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </TabsContent>
      <TabsContent value="all">
        <ScrollArea className="max-h-80 rounded-md border bg-muted/30 p-3">
          <div className="space-y-1">
            {visibleKeys.map((key) => {
              const isChanged = changed.some((c) => c.key === key);
              const val = newData[key];
              return (
                <div key={key} className={`flex gap-2 text-xs py-0.5 px-1 rounded ${isChanged ? "bg-accent" : ""}`}>
                  {isChanged && <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />}
                  <span className={`font-mono min-w-[140px] ${isChanged ? "text-primary font-medium" : "text-muted-foreground"}`}>{key}:</span>
                  <span className="text-foreground break-all">{formatValue(val)}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

/* ── Data View (INSERT / DELETE) ── */

function DataView({ data, variant }: { data: Record<string, unknown>; variant: "added" | "removed" }) {
  const Icon = variant === "added" ? Plus : Minus;
  const iconColor = variant === "added" ? "text-emerald-500" : "text-destructive";
  const entries = Object.entries(data).filter(([k]) => !HIDDEN_FIELDS.has(k));

  return (
    <ScrollArea className="max-h-72 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1">
        {entries.map(([key, val]) => (
          <div key={key} className="flex gap-2 text-xs py-0.5">
            <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${iconColor}`} />
            <span className="font-mono text-muted-foreground min-w-[140px]">{key}:</span>
            <span className="text-foreground break-all">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/* ── Main Page ── */

export default function AuditLog() {
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher, isLoading: companyLoading } = useCompany();

  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [emailSearch, setEmailSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [detail, setDetail] = useState<AuditLogType | null>(null);

  useEffect(() => {
    if (!companyLoading && !isCompanyAdmin && !isCipher) {
      navigate("/dashboard", { replace: true });
    }
  }, [companyLoading, isCompanyAdmin, isCipher, navigate]);

  const { data: result, isLoading } = useAuditLogs({
    table_name: tableFilter === "all" ? "" : tableFilter,
    action: actionFilter === "all" ? "" : actionFilter,
    user_email: emailSearch,
    limit: pageSize,
    offset: page * pageSize,
  });

  const logs = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = page * pageSize + 1;
  const endIndex = Math.min((page + 1) * pageSize, totalCount);

  // Fetch user profiles for avatar display
  const logUserIds = useMemo(() => [...new Set(logs.map(l => l.user_id))], [logs]);
  const { data: logProfiles = [] } = useQuery({
    queryKey: ["audit-user-profiles", logUserIds],
    queryFn: async () => {
      if (logUserIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", logUserIds);
      return data ?? [];
    },
    enabled: logUserIds.length > 0,
  });
  const getProfile = (userId: string) => logProfiles.find(p => p.user_id === userId);

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
                      <TableHead className="w-[150px]">Timestamp</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead className="hidden lg:table-cell">Description</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const profile = getProfile(log.user_id);
                      const { label: actionLabel, color: actionColor } = getActionLabel(log.table_name, log.action);
                      const entityName = getEntityName(log);
                      const entityLink = getEntityLink(log);
                      const desc = getDescription(log);

                      return (
                        <TableRow key={log.id} className="group">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "MMM dd, yyyy")}
                            <br />
                            <span className="text-[11px] opacity-70">{format(new Date(log.created_at), "hh:mm:ss a")}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserAvatar
                                avatarUrl={profile?.avatar_url}
                                fullName={profile?.full_name}
                                size="sm"
                              />
                              <span className="text-sm truncate max-w-[120px]">
                                {profile?.full_name || log.user_email || log.user_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={actionColor} variant="outline">{actionLabel}</Badge>
                          </TableCell>
                          <TableCell>
                            {entityLink ? (
                              <Link to={entityLink} className="text-sm font-medium text-primary hover:underline truncate max-w-[140px] block">
                                {entityName}
                              </Link>
                            ) : (
                              <span className="text-sm truncate max-w-[140px] block">{entityName}</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-xs text-muted-foreground line-clamp-2 max-w-[250px]">{desc}</span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setDetail(log)} title="View details" className="opacity-50 group-hover:opacity-100 transition-opacity">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                currentPage={page + 1}
                totalPages={totalPages}
                totalItems={totalCount}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsPerPage={pageSize}
                onPageChange={(p) => setPage(p - 1)}
                onItemsPerPageChange={(size) => { setPageSize(size); setPage(0); }}
                canGoNext={page < totalPages - 1}
                canGoPrev={page > 0}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Audit Detail
              {detail && (() => {
                const { label, color } = getActionLabel(detail.table_name, detail.action);
                return <Badge className={color} variant="outline">{label}</Badge>;
              })()}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              {/* Summary header */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border bg-muted/30 p-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Performed By</p>
                  <div className="flex items-center gap-2">
                    <UserAvatar avatarUrl={getProfile(detail.user_id)?.avatar_url} fullName={getProfile(detail.user_id)?.full_name} size="sm" />
                    <span className="font-medium">{getProfile(detail.user_id)?.full_name || detail.user_email || detail.user_id.slice(0, 8)}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{format(new Date(detail.created_at), "MMM dd, yyyy · hh:mm:ss a")}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Entity</p>
                  <p className="font-medium">{getEntityName(detail)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Record ID</p>
                  <p className="font-mono text-xs">{detail.record_id}</p>
                </div>
              </div>

              {/* Description */}
              {getDescription(detail) && (
                <div className="rounded-md border bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm">{getDescription(detail)}</p>
                </div>
              )}

              {/* Data section */}
              {detail.action === "UPDATE" && detail.old_data && detail.new_data ? (
                <div>
                  <p className="font-medium mb-2">Before → After</p>
                  <DiffView oldData={detail.old_data} newData={detail.new_data} />
                </div>
              ) : detail.action === "INSERT" && detail.new_data ? (
                <div>
                  <p className="font-medium mb-2">Created Data</p>
                  <DataView data={detail.new_data} variant="added" />
                </div>
              ) : detail.action === "DELETE" && detail.old_data ? (
                <div>
                  <p className="font-medium mb-2">Deleted Data</p>
                  <DataView data={detail.old_data} variant="removed" />
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
