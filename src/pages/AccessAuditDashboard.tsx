import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Activity, Users, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useDashboardAccessAudit } from "@/hooks/useDashboardAccessAudit";

export default function AccessAuditDashboard() {
  const {
    logs, total, isLoading, filters,
    setAnomalyOnly, setEmailSearch, setPage, summary,
  } = useDashboardAccessAudit();

  const totalPages = Math.ceil(total / filters.pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Access Audit Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time dashboard access monitoring &amp; anomaly detection</p>
      </div>

      {/* Anomaly Alert Banner */}
      {summary.anomalyCount > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-destructive">{summary.anomalyCount} anomal{summary.anomalyCount === 1 ? "y" : "ies"} in the last 24h</span>
          </div>
          <ul className="space-y-1 text-sm text-destructive/90">
            {summary.recentAnomalies.map((a: any) => (
              <li key={a.id || a.created_at} className="flex items-center gap-2">
                <span className="font-mono text-xs">{format(new Date(a.created_at), "HH:mm:ss")}</span>
                <span>{a.user_email || a.user_id}</span>
                <span className="text-muted-foreground">—</span>
                <span>{a.anomaly_reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accesses (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalAccesses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Users (24h)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.uniqueUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Anomalies (24h)</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", summary.anomalyCount > 0 ? "text-destructive" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", summary.anomalyCount > 0 && "text-destructive")}>{summary.anomalyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Companies (24h)</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeCompanies}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by email…"
          value={filters.emailSearch}
          onChange={(e) => setEmailSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Switch
            id="anomaly-toggle"
            checked={filters.anomalyOnly}
            onCheckedChange={setAnomalyOnly}
          />
          <Label htmlFor="anomaly-toggle" className="text-sm">Anomalies only</Label>
        </div>
      </div>

      {/* Access Log Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>View</TableHead>
                <TableHead>Anomaly</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No access logs found</TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className={cn(log.is_anomaly && "bg-destructive/5")}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm truncate max-w-[180px]">{log.user_email || log.user_id}</span>
                        {log.is_cipher && <Badge variant="outline" className="text-[10px]">Cipher</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                      {log.company_id ? log.company_id.slice(0, 8) + "…" : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{log.membership_role || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.view_path === "full" ? "default" : "outline"} className="text-xs">
                        {log.view_path}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.is_anomaly ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-xs text-destructive truncate max-w-[200px]">{log.anomaly_reason}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{total} total logs</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={filters.page === 0} onClick={() => setPage(filters.page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {filters.page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={filters.page >= totalPages - 1} onClick={() => setPage(filters.page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
