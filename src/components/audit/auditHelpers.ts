import { format } from "date-fns";
import type { AuditLog as AuditLogType } from "@/hooks/useAuditLogs";

/* ── Constants ── */

export const TABLE_OPTIONS = [
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
  { value: "user_roles", label: "Role Changes" },
];

export const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
];

export const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "data_entry_operator", label: "DEO" },
  { value: "viewer", label: "Viewer" },
];

export const DEFAULT_PAGE_SIZE = 25;

export const HIDDEN_FIELDS = new Set(["id", "user_id", "company_id", "created_at", "updated_at"]);

export const FIELD_LABELS: Record<string, Record<string, string>> = {
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
  user_roles: { role: "Platform Role", assigned_by: "Assigned By" },
};

export const BOOLEAN_FIELD_TABLES = new Set(["company_memberships", "moderator_permissions"]);

/* ── Helpers ── */

export function getActionLabel(table: string, action: string, log?: AuditLogType): { label: string; color: string } {
  if (table === "user_roles") {
    if (action === "INSERT") return { label: "Role Assigned", color: "bg-violet-500/15 text-violet-600 border-violet-500/20 dark:text-violet-400" };
    if (action === "UPDATE") return { label: "Role Changed", color: "bg-violet-500/15 text-violet-600 border-violet-500/20 dark:text-violet-400" };
    if (action === "DELETE") return { label: "Role Revoked", color: "bg-destructive/15 text-destructive border-destructive/20" };
  }
  if (table === "company_memberships" && action === "UPDATE" && log?.old_data && log?.new_data) {
    const o = log.old_data as Record<string, unknown>;
    const n = log.new_data as Record<string, unknown>;
    if (o.role !== n.role) return { label: "Role Changed", color: "bg-violet-500/15 text-violet-600 border-violet-500/20 dark:text-violet-400" };
    if (o.status !== n.status) return { label: n.status === "active" ? "Member Activated" : "Member Deactivated", color: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400" };
    const permKeys = ["deo_students", "deo_payments", "deo_batches", "deo_finance",
      "mod_students_add", "mod_students_edit", "mod_students_delete",
      "mod_payments_add", "mod_payments_edit", "mod_payments_delete",
      "mod_batches_add", "mod_batches_edit", "mod_batches_delete",
      "mod_expenses_add", "mod_expenses_edit", "mod_expenses_delete",
      "mod_revenue_add", "mod_revenue_edit", "mod_revenue_delete"];
    if (permKeys.some(k => o[k] !== n[k])) return { label: "Permissions Changed", color: "bg-violet-500/15 text-violet-600 border-violet-500/20 dark:text-violet-400" };
  }
  if (table === "companies" && action === "UPDATE" && log?.old_data && log?.new_data) {
    const o = log.old_data as Record<string, unknown>;
    const n = log.new_data as Record<string, unknown>;
    if (o.currency !== n.currency || o.exchange_rate !== n.exchange_rate || o.base_currency !== n.base_currency) return { label: "Currency Updated", color: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400" };
    if (o.fiscal_year_start_month !== n.fiscal_year_start_month) return { label: "Fiscal Year Changed", color: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400" };
    if (o.name !== n.name || o.description !== n.description || o.logo_url !== n.logo_url) return { label: "Company Profile Updated", color: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400" };
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
    user_roles: { INSERT: "Role Assigned", UPDATE: "Role Changed", DELETE: "Role Revoked" },
  };
  const label = map[table]?.[action] || `${action}`;
  const color = action === "INSERT" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
    : action === "UPDATE" ? "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400"
    : action === "DELETE" ? "bg-destructive/15 text-destructive border-destructive/20"
    : "bg-muted text-muted-foreground";
  return { label, color };
}

export function getEntityName(log: AuditLogType, studentNameMap?: Map<string, string>): string {
  const d = log.new_data || log.old_data;
  if (!d) return log.record_id.slice(0, 8);
  if (typeof d.name === "string") return d.name;
  if (typeof d.batch_name === "string") return d.batch_name;
  if (typeof d.course_name === "string") return d.course_name;
  if (log.table_name === "student_payments") {
    if (typeof d.student_id === "string" && studentNameMap?.has(d.student_id)) return studentNameMap.get(d.student_id)!;
    return "Payment";
  }
  if (log.table_name === "revenues") {
    if (typeof d.description === "string" && d.description.length > 0) return d.description.length > 60 ? d.description.slice(0, 57) + "…" : d.description;
    return "Revenue";
  }
  if (log.table_name === "company_memberships" || log.table_name === "company_join_requests") return log.user_email || (typeof d.user_id === "string" ? d.user_id.slice(0, 8) : log.record_id.slice(0, 8));
  if (log.table_name === "moderator_permissions") return log.user_email || "Moderator";
  if (log.table_name === "user_roles") return log.user_email || "User";
  if (log.table_name === "student_batch_history") return typeof d.student_id === "string" ? `Student ${d.student_id.slice(0, 8)}` : "Batch Transfer";
  if (typeof d.description === "string" && (d.description as string).length < 50) return d.description as string;
  return log.record_id.slice(0, 8);
}

export function getEntityLink(log: AuditLogType): string | null {
  const id = log.record_id;
  switch (log.table_name) {
    case "students": return `/students/${id}`;
    case "batches": return `/batches/${id}`;
    case "courses": return `/courses/${id}`;
    default: return null;
  }
}

export function getDescription(log: AuditLogType): string {
  const d = log.new_data || log.old_data;
  if (!d) return "";
  if (log.table_name === "student_payments") {
    const parts: string[] = [];
    if (d.payment_type) parts.push(`Type: ${d.payment_type === "admission" ? "Admission Fee" : "Monthly Fee"}`);
    if (d.amount) parts.push(`Amount: ${d.amount}`);
    if (d.months_covered && Array.isArray(d.months_covered) && (d.months_covered as string[]).length > 0) parts.push(`Months: ${(d.months_covered as string[]).join(", ")}`);
    parts.push("→ Revenue auto-recorded");
    return parts.join(" · ");
  }
  if (log.table_name === "students") {
    const parts: string[] = [];
    if (d.name) parts.push(String(d.name));
    if (d.student_id_number) parts.push(`ID: ${d.student_id_number}`);
    return parts.join(" · ");
  }
  if (log.table_name === "expenses" && d.amount) return `Amount: ${d.amount}${d.description ? ` — ${d.description}` : ""}`;
  if (log.table_name === "khata_transfers" && d.amount) return `Amount: ${d.amount}${d.description ? ` — ${d.description}` : ""}`;
  if (log.table_name === "company_memberships") {
    const parts: string[] = [];
    if (d.role) parts.push(`Role: ${d.role}`);
    if (d.status) parts.push(`Status: ${d.status}`);
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
      const granted: string[] = []; const revoked: string[] = [];
      for (const [key, label] of Object.entries(permLabels)) {
        if (o[key] !== n[key]) { if (n[key] === true) granted.push(label); else revoked.push(label); }
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
      const o = log.old_data as Record<string, unknown>; const n = log.new_data as Record<string, unknown>;
      if (o.name !== n.name) parts.push(`Renamed: ${o.name} → ${n.name}`);
      if (o.is_active !== n.is_active) parts.push(n.is_active ? "Activated" : "Deactivated");
    } else if (log.action === "INSERT") { if (d.is_active === false) parts.push("Created inactive"); }
    return parts.join(" · ") || "";
  }
  if (log.table_name === "company_join_requests") {
    const parts: string[] = [];
    if (d.status) parts.push(`Status: ${d.status}`);
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>; const n = log.new_data as Record<string, unknown>;
      if (o.status !== n.status) parts.push(`${o.status} → ${n.status}`);
      if (n.rejection_reason) parts.push(`Reason: ${String(n.rejection_reason).slice(0, 60)}`);
      if (n.banned_until) parts.push(`Banned until: ${String(n.banned_until).slice(0, 10)}`);
    }
    if (d.message && log.action === "INSERT") parts.push(`Message: ${String(d.message).slice(0, 60)}`);
    return parts.join(" · ");
  }
  if (log.table_name === "moderator_permissions") {
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>; const n = log.new_data as Record<string, unknown>;
      const flagLabels: Record<string, string> = { can_add_revenue: "Add Revenue", can_add_expense: "Add Expense", can_add_expense_source: "Add Expense Source", can_transfer: "Transfer", can_view_reports: "View Reports" };
      const granted: string[] = []; const revoked: string[] = [];
      for (const [key, label] of Object.entries(flagLabels)) { if (o[key] !== n[key]) { if (n[key] === true) granted.push(label); else revoked.push(label); } }
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
    if (d.from_batch_id && d.to_batch_id) parts.push(`From: ${String(d.from_batch_id).slice(0, 8)} → To: ${String(d.to_batch_id).slice(0, 8)}`);
    else if (d.to_batch_id) parts.push(`Assigned to batch: ${String(d.to_batch_id).slice(0, 8)}`);
    else if (d.from_batch_id) parts.push(`Removed from batch: ${String(d.from_batch_id).slice(0, 8)}`);
    if (d.reason) parts.push(`Reason: ${d.reason}`);
    return parts.join(" · ") || "Batch transfer";
  }
  if (log.table_name === "companies") {
    const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>; const n = log.new_data as Record<string, unknown>;
      const changes: string[] = [];
      if (o.name !== n.name) changes.push(`Name: ${o.name} → ${n.name}`);
      if (o.currency !== n.currency || o.exchange_rate !== n.exchange_rate || o.base_currency !== n.base_currency) {
        const currParts: string[] = [];
        if (o.currency !== n.currency) currParts.push(`Display: ${o.currency} → ${n.currency}`);
        if (o.base_currency !== n.base_currency) currParts.push(`Base: ${o.base_currency} → ${n.base_currency}`);
        if (o.exchange_rate !== n.exchange_rate) { const dc = (n.currency || o.currency) as string; currParts.push(`Rate: 1 ${dc} = ${o.exchange_rate} BDT → ${n.exchange_rate} BDT`); }
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
  if (log.table_name === "user_roles") {
    const ROLE_DISPLAY: Record<string, string> = { cipher: "Cipher (Super Admin)", admin: "Admin", moderator: "Moderator", user: "User" };
    const roleName = (r: unknown) => ROLE_DISPLAY[String(r)] || String(r);
    if (log.action === "INSERT") return `🛡️ Assigned platform role: ${roleName(d.role)}`;
    if (log.action === "DELETE") return `🛡️ Revoked platform role: ${roleName(d.role)}`;
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const o = log.old_data as Record<string, unknown>; const n = log.new_data as Record<string, unknown>;
      if (o.role !== n.role) return `🛡️ Role changed: ${roleName(o.role)} → ${roleName(n.role)}`;
      return "🛡️ Role record updated";
    }
    return `Role: ${roleName(d.role)}`;
  }
  return "";
}

export function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function formatFieldValue(val: unknown, key: string, tableName?: string): string {
  if (val === null || val === undefined) return "—";
  if (tableName && BOOLEAN_FIELD_TABLES.has(tableName) && typeof val === "boolean") return val ? "✅ Enabled" : "❌ Disabled";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function getFieldLabel(key: string, tableName?: string): string {
  if (tableName && FIELD_LABELS[tableName]?.[key]) return FIELD_LABELS[tableName][key];
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
