import { useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Search, ClipboardList, Plus, Minus, ArrowRight, Download, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/components/shared/TablePagination";
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
  { value: "company_memberships", label: "Members" },
  { value: "revenue_sources", label: "Revenue Sources" },
  { value: "company_join_requests", label: "Join Requests" },
  { value: "moderator_permissions", label: "Permissions" },
  { value: "student_batch_history", label: "Batch Transfers" },
  { value: "companies", label: "Company Settings" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
];

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "data_entry_operator", label: "DEO" },
  { value: "viewer", label: "Viewer" },
];

const DEFAULT_PAGE_SIZE = 25;

/* ── Helpers ── */

function getActionLabel(table: string, action: string, log?: AuditLogType): { label: string; color: string } {
  // Smart labels for company_memberships based on what changed
  if (table === "company_memberships" && action === "UPDATE" && log?.old_data && log?.new_data) {
    const o = log.old_data as Record<string, unknown>;
    const n = log.new_data as Record<string, unknown>;
    if (o.role !== n.role) {
      return { label: "Role Changed", color: "bg-violet-500/15 text-violet-600 border-violet-500/20 dark:text-violet-400" };
    }
    if (o.status !== n.status) {
      const statusLabel = n.status === "active" ? "Member Activated" : "Member Deactivated";
      return { label: statusLabel, color: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400" };
    }
    // Check if any permission flags changed
    const permKeys = ["deo_students", "deo_payments", "deo_batches", "deo_finance",
      "mod_students_add", "mod_students_edit", "mod_students_delete",
      "mod_payments_add", "mod_payments_edit", "mod_payments_delete",
      "mod_batches_add", "mod_batches_edit", "mod_batches_delete",
      "mod_expenses_add", "mod_expenses_edit", "mod_expenses_delete",
      "mod_revenue_add", "mod_revenue_edit", "mod_revenue_delete"];
    if (permKeys.some(k => o[k] !== n[k])) {
      return { label: "Permissions Changed", color: "bg-violet-500/15 text-violet-600 border-violet-500/20 dark:text-violet-400" };
    }
  }

  // Smart labels for companies based on what changed
  if (table === "companies" && action === "UPDATE" && log?.old_data && log?.new_data) {
    const o = log.old_data as Record<string, unknown>;
    const n = log.new_data as Record<string, unknown>;
    if (o.currency !== n.currency || o.exchange_rate !== n.exchange_rate || o.base_currency !== n.base_currency) {
      return { label: "Currency Updated", color: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400" };
    }
    if (o.fiscal_year_start_month !== n.fiscal_year_start_month) {
      return { label: "Fiscal Year Changed", color: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400" };
    }
    if (o.name !== n.name || o.description !== n.description || o.logo_url !== n.logo_url) {
      return { label: "Company Profile Updated", color: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400" };
    }
  }

  const map: Record<string, Record<string, string>> = {
    student_payments: { INSERT: "Payment Recorded", UPDATE: "Payment Updated", DELETE: "Payment Deleted" },
    students: { INSERT: "Student Added", UPDATE: "Student Updated", DELETE: "Student Removed" },
    batches: { INSERT: "Batch Created", UPDATE: "Batch Updated", DELETE: "Batch Deleted" },
    revenues: { INSERT: "Revenue Added", UPDATE: "Revenue Updated", DELETE: "Revenue Deleted" },
    expenses: { INSERT: "Expense Added", UPDATE: "Expense Updated", DELETE: "Expense Deleted" },
    expense_accounts: { INSERT: "Source Created", UPDATE: "Source Updated", DELETE: "Source Deleted" },
    khata_transfers: { INSERT: "Transfer Made", UPDATE: "Transfer Updated", DELETE: "Transfer Deleted" },
    courses: { INSERT: "Course Created", UPDATE: "Course Updated", DELETE: "Course Deleted" },
    company_memberships: { INSERT: "Member Added", UPDATE: "Member Updated", DELETE: "Member Removed" },
    revenue_sources: { INSERT: "Source Created", UPDATE: "Source Updated", DELETE: "Source Deleted" },
    company_join_requests: { INSERT: "Request Submitted", UPDATE: "Request Updated", DELETE: "Request Deleted" },
    moderator_permissions: { INSERT: "Permissions Set", UPDATE: "Permissions Updated", DELETE: "Permissions Removed" },
    student_batch_history: { INSERT: "Batch Transfer Recorded", UPDATE: "Batch Transfer Updated", DELETE: "Batch Transfer Deleted" },
    companies: { INSERT: "Company Created", UPDATE: "Company Updated", DELETE: "Company Deleted" },
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
  // Named entities
  if (typeof d.name === "string") return d.name;
  if (typeof d.batch_name === "string") return d.batch_name;
  if (typeof d.course_name === "string") return d.course_name;
  // Email-based entities (memberships, join requests)
  if (log.table_name === "company_memberships" || log.table_name === "company_join_requests") {
    return log.user_email || (typeof d.user_id === "string" ? d.user_id.slice(0, 8) : log.record_id.slice(0, 8));
  }
  // Moderator permissions — show target user
  if (log.table_name === "moderator_permissions") {
    return log.user_email || "Moderator";
  }
  // Batch transfers — reference student
  if (log.table_name === "student_batch_history") {
    return typeof d.student_id === "string" ? `Student ${d.student_id.slice(0, 8)}` : "Batch Transfer";
  }
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
  if (log.table_name === "company_memberships") {
    const parts: string[] = [];
    if (d.role) parts.push(`Role: ${d.role}`);
    if (d.status) parts.push(`Status: ${d.status}`);
    // Show explicit permission diff on UPDATE
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>;
      const n = log.new_data as Record<string, unknown>;
      if (o.role !== n.role) parts.push(`${o.role} → ${n.role}`);
      const permLabels: Record<string, string> = {
        deo_students: "Students", deo_payments: "Payments", deo_batches: "Batches", deo_finance: "Finance",
        mod_students_add: "Students Add", mod_students_edit: "Students Edit", mod_students_delete: "Students Delete",
        mod_payments_add: "Payments Add", mod_payments_edit: "Payments Edit", mod_payments_delete: "Payments Delete",
        mod_batches_add: "Batches Add", mod_batches_edit: "Batches Edit", mod_batches_delete: "Batches Delete",
        mod_expenses_add: "Expenses Add", mod_expenses_edit: "Expenses Edit", mod_expenses_delete: "Expenses Delete",
        mod_revenue_add: "Revenue Add", mod_revenue_edit: "Revenue Edit", mod_revenue_delete: "Revenue Delete",
      };
      const granted: string[] = [];
      const revoked: string[] = [];
      for (const [key, label] of Object.entries(permLabels)) {
        if (o[key] !== n[key]) {
          if (n[key] === true) granted.push(label);
          else revoked.push(label);
        }
      }
      if (granted.length > 0) parts.push(`Granted: ${granted.join(", ")}`);
      if (revoked.length > 0) parts.push(`Revoked: ${revoked.join(", ")}`);
    }
    return parts.join(" · ");
  }
  if (log.table_name === "revenue_sources") {
    const parts: string[] = [];
    if (d.name) parts.push(`Source: ${d.name}`);
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>;
      const n = log.new_data as Record<string, unknown>;
      if (o.name !== n.name) parts.push(`Renamed: ${o.name} → ${n.name}`);
      if (o.is_active !== n.is_active) parts.push(n.is_active ? "Activated" : "Deactivated");
    } else if (log.action === "INSERT") {
      if (d.is_active === false) parts.push("Created inactive");
    }
    return parts.join(" · ") || "";
  }
  if (log.table_name === "company_join_requests") {
    const parts: string[] = [];
    if (d.status) parts.push(`Status: ${d.status}`);
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>;
      const n = log.new_data as Record<string, unknown>;
      if (o.status !== n.status) parts.push(`${o.status} → ${n.status}`);
      if (n.rejection_reason) parts.push(`Reason: ${String(n.rejection_reason).slice(0, 60)}`);
      if (n.banned_until) parts.push(`Banned until: ${String(n.banned_until).slice(0, 10)}`);
    }
    if (d.message && log.action === "INSERT") parts.push(`Message: ${String(d.message).slice(0, 60)}`);
    return parts.join(" · ");
  }
  if (log.table_name === "moderator_permissions") {
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>;
      const n = log.new_data as Record<string, unknown>;
      const flagLabels: Record<string, string> = {
        can_add_revenue: "Add Revenue", can_add_expense: "Add Expense",
        can_add_expense_source: "Add Expense Source", can_transfer: "Transfer", can_view_reports: "View Reports",
      };
      const granted: string[] = [];
      const revoked: string[] = [];
      for (const [key, label] of Object.entries(flagLabels)) {
        if (o[key] !== n[key]) {
          if (n[key] === true) granted.push(label);
          else revoked.push(label);
        }
      }
      const parts: string[] = [];
      if (granted.length > 0) parts.push(`Granted: ${granted.join(", ")}`);
      if (revoked.length > 0) parts.push(`Revoked: ${revoked.join(", ")}`);
      return parts.join(" · ") || "Permissions unchanged";
    }
    const flags = ["can_add_revenue", "can_add_expense", "can_add_expense_source", "can_transfer", "can_view_reports"] as const;
    const enabled = flags.filter(f => d[f] === true).map(f => f.replace("can_", "").replace(/_/g, " "));
    return enabled.length > 0 ? `Enabled: ${enabled.join(", ")}` : "All permissions disabled";
  }
  if (log.table_name === "student_batch_history") {
    const parts: string[] = [];
    if (d.from_batch_id && d.to_batch_id) {
      parts.push(`From: ${String(d.from_batch_id).slice(0, 8)} → To: ${String(d.to_batch_id).slice(0, 8)}`);
    } else if (d.to_batch_id) {
      parts.push(`Assigned to batch: ${String(d.to_batch_id).slice(0, 8)}`);
    } else if (d.from_batch_id) {
      parts.push(`Removed from batch: ${String(d.from_batch_id).slice(0, 8)}`);
    }
    if (d.reason) parts.push(`Reason: ${d.reason}`);
    return parts.join(" · ") || "Batch transfer";
  }
  if (log.table_name === "companies") {
    const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>;
      const n = log.new_data as Record<string, unknown>;
      const changes: string[] = [];
      if (o.name !== n.name) changes.push(`Name: ${o.name} → ${n.name}`);
      if (o.currency !== n.currency || o.exchange_rate !== n.exchange_rate || o.base_currency !== n.base_currency) {
        const currParts: string[] = [];
        if (o.currency !== n.currency) currParts.push(`Display: ${o.currency} → ${n.currency}`);
        if (o.base_currency !== n.base_currency) currParts.push(`Base: ${o.base_currency} → ${n.base_currency}`);
        if (o.exchange_rate !== n.exchange_rate) {
          const dispCurr = (n.currency || o.currency) as string;
          currParts.push(`Rate: 1 ${dispCurr} = ${o.exchange_rate} BDT → ${n.exchange_rate} BDT`);
        }
        changes.push(`💱 Currency — ${currParts.join(", ")}`);
      }
      if (o.fiscal_year_start_month !== n.fiscal_year_start_month) {
        const oldMonth = MONTH_NAMES[(Number(o.fiscal_year_start_month) || 1) - 1] || String(o.fiscal_year_start_month);
        const newMonth = MONTH_NAMES[(Number(n.fiscal_year_start_month) || 1) - 1] || String(n.fiscal_year_start_month);
        changes.push(`📅 Fiscal Year Start: ${oldMonth} → ${newMonth}`);
      }
      if (o.description !== n.description) changes.push("Description updated");
      if (o.logo_url !== n.logo_url) changes.push("Logo updated");
      if (o.join_password !== n.join_password) changes.push("🔑 Join password changed");
      if (o.invite_code !== n.invite_code) changes.push("🔗 Invite code changed");
      return changes.length > 0 ? changes.join(" · ") : `Company: ${d.name || ""}`;
    }
    return d.name ? `Company: ${d.name}` : "";
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

const FIELD_LABELS: Record<string, Record<string, string>> = {
  company_memberships: {
    role: "Role", status: "Status", approved_by: "Approved By",
    deo_students: "Student Management", deo_payments: "Payment Recording", deo_batches: "Batch Management", deo_finance: "Revenue & Expenses",
    mod_students_add: "Students — Add", mod_students_edit: "Students — Edit", mod_students_delete: "Students — Delete",
    mod_payments_add: "Payments — Add", mod_payments_edit: "Payments — Edit", mod_payments_delete: "Payments — Delete",
    mod_batches_add: "Batches — Add", mod_batches_edit: "Batches — Edit", mod_batches_delete: "Batches — Delete",
    mod_expenses_add: "Expenses — Add", mod_expenses_edit: "Expenses — Edit", mod_expenses_delete: "Expenses — Delete",
    mod_revenue_add: "Revenue — Add", mod_revenue_edit: "Revenue — Edit", mod_revenue_delete: "Revenue — Delete",
    can_add_expense: "Add Expense", can_add_expense_source: "Add Expense Source", can_add_revenue: "Add Revenue",
    can_manage_students: "Manage Students", can_transfer: "Transfer", can_view_reports: "View Reports",
  },
  moderator_permissions: {
    can_add_revenue: "Add Revenue", can_add_expense: "Add Expense",
    can_add_expense_source: "Add Expense Source", can_transfer: "Transfer", can_view_reports: "View Reports",
    controlled_by: "Controlled By",
  },
  companies: {
    name: "Company Name", description: "Description", currency: "Currency", base_currency: "Base Currency",
    exchange_rate: "Exchange Rate", fiscal_year_start_month: "Fiscal Year Start Month",
    logo_url: "Logo", join_password: "Join Password", invite_code: "Invite Code", slug: "Slug",
  },
  user_roles: {
    role: "Platform Role", assigned_by: "Assigned By",
  },
};

const BOOLEAN_FIELD_TABLES = new Set(["company_memberships", "moderator_permissions"]);

function formatFieldValue(val: unknown, key: string, tableName?: string): string {
  if (val === null || val === undefined) return "—";
  if (tableName && BOOLEAN_FIELD_TABLES.has(tableName) && typeof val === "boolean") {
    return val ? "✅ Enabled" : "❌ Disabled";
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function getFieldLabel(key: string, tableName?: string): string {
  if (tableName && FIELD_LABELS[tableName]?.[key]) return FIELD_LABELS[tableName][key];
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function DiffView({ oldData, newData, tableName }: { oldData: Record<string, unknown>; newData: Record<string, unknown>; tableName?: string }) {
  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
  const changed: { key: string; old: unknown; new: unknown }[] = [];

  for (const key of allKeys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.push({ key, old: oldData[key], new: newData[key] });
    }
  }

  // For permission tables, separate boolean permission changes from other changes
  const isPermTable = tableName && BOOLEAN_FIELD_TABLES.has(tableName);
  const permChanges = isPermTable ? changed.filter(c => typeof c.new === "boolean" || typeof c.old === "boolean") : [];
  const otherChanges = isPermTable ? changed.filter(c => typeof c.new !== "boolean" && typeof c.old !== "boolean") : changed;

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
            <div className="space-y-3">
              {/* Permission summary for permission tables */}
              {isPermTable && permChanges.length > 0 && (
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Permission Changes</p>
                  <div className="grid gap-1.5">
                    {permChanges.map(({ key, old: oldVal, new: newVal }) => (
                      <div key={key} className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 ${newVal === true ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                        {newVal === true ? (
                          <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <span className="font-medium">{getFieldLabel(key, tableName)}</span>
                        <span className="ml-auto text-muted-foreground">
                          {newVal === true ? "Granted" : "Revoked"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Other (non-boolean) changes */}
              {(isPermTable ? otherChanges : changed).map(({ key, old: oldVal, new: newVal }) => (
                <div key={key} className="rounded-md border border-border bg-background p-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{getFieldLabel(key, tableName)}</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-2 text-xs rounded px-2 py-1 bg-destructive/10">
                      <Minus className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
                      <span className="break-all">{formatFieldValue(oldVal, key, tableName)}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs rounded px-2 py-1 bg-emerald-500/10">
                      <Plus className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                      <span className="break-all">{formatFieldValue(newVal, key, tableName)}</span>
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
                  <span className={`font-mono min-w-[140px] ${isChanged ? "text-primary font-medium" : "text-muted-foreground"}`}>{getFieldLabel(key, tableName)}:</span>
                  <span className="text-foreground break-all">{formatFieldValue(val, key, tableName)}</span>
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
  const queryClient = useQueryClient();
  const { isCompanyAdmin, isCipher, isLoading: companyLoading, activeCompanyId } = useCompany();

  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [emailSearch, setEmailSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [detail, setDetail] = useState<AuditLogType | null>(null);

  // Bulk selection (Cipher only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((logs: AuditLogType[]) => {
    setSelectedIds(prev => {
      const allOnPage = logs.map(l => l.id);
      const allSelected = allOnPage.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allOnPage.forEach(id => next.delete(id));
        return next;
      }
      return new Set([...prev, ...allOnPage]);
    });
  }, []);

  useEffect(() => {
    if (!companyLoading && !isCompanyAdmin && !isCipher) {
      navigate("/dashboard", { replace: true });
    }
  }, [companyLoading, isCompanyAdmin, isCipher, navigate]);

  const { data: result, isLoading } = useAuditLogs({
    table_name: tableFilter === "all" ? "" : tableFilter,
    action: actionFilter === "all" ? "" : actionFilter,
    user_email: emailSearch,
    role: roleFilter === "all" ? "" : roleFilter,
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

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    if (!activeCompanyId) return;
    setIsExporting(true);
    try {
      // Fetch ALL matching audit logs (not just current page)
      let allLogs: AuditLogType[] = [];
      const batchSize = 1000;
      let fetchOffset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("audit_logs" as any)
          .select("*")
          .eq("company_id", activeCompanyId)
          .order("created_at", { ascending: false })
          .range(fetchOffset, fetchOffset + batchSize - 1);

        if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
        if (actionFilter !== "all") query = query.eq("action", actionFilter);
        if (emailSearch.trim()) {
          const sanitized = emailSearch.trim().replace(/[%_\\]/g, "\\$&");
          query = query.ilike("user_email", `%${sanitized}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        const batch = (data ?? []) as unknown as AuditLogType[];
        allLogs = [...allLogs, ...batch];
        hasMore = batch.length === batchSize;
        fetchOffset += batchSize;
      }

      if (allLogs.length === 0) {
        toast.info("No audit entries to export");
        return;
      }

      // Fetch memberships for role + approver info
      const userIds = [...new Set(allLogs.map(l => l.user_id))];
      const { data: memberships } = await supabase
        .from("company_memberships")
        .select("user_id, role, approved_by")
        .eq("company_id", activeCompanyId)
        .in("user_id", userIds);

      const memberMap = new Map<string, { role: string; approved_by: string | null }>();
      (memberships ?? []).forEach(m => memberMap.set(m.user_id, { role: m.role, approved_by: m.approved_by }));

      // Fetch approver names
      const approverIds = [...new Set((memberships ?? []).map(m => m.approved_by).filter(Boolean))] as string[];
      const approverMap = new Map<string, string>();
      if (approverIds.length > 0) {
        const { data: approverProfiles } = await supabase
          .from("user_profiles")
          .select("user_id, full_name, email")
          .in("user_id", approverIds);
        (approverProfiles ?? []).forEach(p => approverMap.set(p.user_id, p.full_name || p.email || p.user_id));
      }

      // Fetch actor names
      const { data: actorProfiles } = await supabase
        .from("user_profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const actorMap = new Map<string, string>();
      (actorProfiles ?? []).forEach(p => actorMap.set(p.user_id, p.full_name || ""));

      // Build CSV
      const roleLabelMap: Record<string, string> = { admin: "Admin", moderator: "Moderator", data_entry_operator: "DEO", viewer: "Viewer" };
      const escCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;

      const headers = ["Timestamp", "User Email", "User Name", "Role", "Approved By", "Action", "Table", "Entity", "Description"];
      const rows = allLogs.map(log => {
        const membership = memberMap.get(log.user_id);
        const approver = membership?.approved_by ? approverMap.get(membership.approved_by) || "" : "";
        const actorName = actorMap.get(log.user_id) || "";
        const { label } = getActionLabel(log.table_name, log.action, log);
        const entityName = getEntityName(log);
        const desc = getDescription(log);

        return [
          escCsv(format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")),
          escCsv(log.user_email || ""),
          escCsv(actorName),
          escCsv(membership ? (roleLabelMap[membership.role] || membership.role) : "Unknown"),
          escCsv(approver),
          escCsv(label),
          escCsv(log.table_name),
          escCsv(entityName),
          escCsv(desc),
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `audit_log_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${allLogs.length} audit entries`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export audit logs");
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (deleteConfirmText !== "DELETE" || selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const idsToDelete = [...selectedIds];
      // Delete in batches of 100
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const batch = idsToDelete.slice(i, i + 100);
        const { error } = await supabase
          .from("audit_logs" as any)
          .delete()
          .in("id", batch);
        if (error) throw error;
      }
      toast.success(`Deleted ${idsToDelete.length} audit ${idsToDelete.length === 1 ? "entry" : "entries"}`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete audit logs. Only platform admins can perform this action.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-sm text-muted-foreground">Track all data changes across your business</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCipher && selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={isExporting || totalCount === 0}>
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
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
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
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
                      {isCipher && (
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={logs.length > 0 && logs.every(l => selectedIds.has(l.id))}
                            onCheckedChange={() => toggleSelectAll(logs)}
                            aria-label="Select all"
                          />
                        </TableHead>
                      )}
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
                      const { label: actionLabel, color: actionColor } = getActionLabel(log.table_name, log.action, log);
                      const entityName = getEntityName(log);
                      const entityLink = getEntityLink(log);
                      const desc = getDescription(log);

                      return (
                        <TableRow key={log.id} className={`group ${selectedIds.has(log.id) ? "bg-destructive/5" : ""}`}>
                          {isCipher && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(log.id)}
                                onCheckedChange={() => toggleSelect(log.id)}
                                aria-label={`Select audit entry ${log.id}`}
                              />
                            </TableCell>
                          )}
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
                const { label, color } = getActionLabel(detail.table_name, detail.action, detail);
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
                  <DiffView oldData={detail.old_data} newData={detail.new_data} tableName={detail.table_name} />
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(o) => { if (!o) { setShowDeleteDialog(false); setDeleteConfirmText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Audit Entries
            </DialogTitle>
            <DialogDescription>
              You are about to permanently delete <strong>{selectedIds.size}</strong> audit {selectedIds.size === 1 ? "entry" : "entries"}. This action cannot be undone and will remove the historical record of these business actions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive mb-1">⚠️ Irreversible Action</p>
              <p className="text-xs text-muted-foreground">
                Deleted audit entries cannot be recovered. Ensure you have exported a backup if needed.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(""); }} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedIds.size} ${selectedIds.size === 1 ? "Entry" : "Entries"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
