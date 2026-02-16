
# Comprehensive Audit Logging for All Business Actions

## Overview
Currently, audit triggers only cover 9 tables (students, student_payments, batches, revenues, expenses, expense_accounts, khata_transfers, courses, user_roles). Several critical business tables -- including company memberships (member add/remove/role change), revenue sources, moderator permissions, company settings, batch transfers, and join requests -- are not audited.

This plan adds audit triggers to all remaining business-critical tables and updates the Audit Log UI to display these new event types.

## Tables to Add Audit Triggers

| Table | Has `company_id` | Has `user_id` | Trigger Strategy |
|-------|:-:|:-:|---|
| company_memberships | Yes | Yes | Reuse existing `audit_log_trigger` directly |
| revenue_sources | Yes | Yes | Reuse existing `audit_log_trigger` directly |
| company_join_requests | Yes | Yes | Reuse existing `audit_log_trigger` directly |
| moderator_permissions | No | Yes | Custom trigger that resolves `company_id` from context |
| student_batch_history | Yes | No (`transferred_by`) | Custom trigger mapping `transferred_by` to `user_id` |
| companies | No (is the entity itself) | No (`created_by`) | Custom trigger mapping `id` to `company_id`, `created_by`/`auth.uid()` to `user_id` |

## Changes

### 1. Database Migration -- Add Audit Triggers

**Direct triggers** (tables compatible with existing `audit_log_trigger`):
- `company_memberships` -- captures member added, role changed, member removed/banned
- `revenue_sources` -- captures source creation, renaming, deactivation
- `company_join_requests` -- captures join request submitted, approved, rejected, banned

**Custom triggers** (tables needing column mapping):

- `moderator_permissions` -- a small custom function that looks up the company from the user's active company or membership, then inserts the audit row
- `student_batch_history` -- maps `transferred_by` to `user_id` and uses `company_id` directly
- `companies` -- maps `id` to `company_id` and `created_by` / `auth.uid()` to `user_id`

### 2. Audit Log UI -- `src/pages/AuditLog.tsx`

**TABLE_OPTIONS** -- add new filter entries:
- "Members" (company_memberships)
- "Revenue Sources" (revenue_sources)
- "Join Requests" (company_join_requests)
- "Permissions" (moderator_permissions)
- "Batch Transfers" (student_batch_history)
- "Company Settings" (companies)

**getActionLabel** -- add semantic labels:
- company_memberships: "Member Added", "Member Updated", "Member Removed"
- revenue_sources: "Source Created", "Source Updated", "Source Deleted"
- company_join_requests: "Request Submitted", "Request Updated", "Request Deleted"
- moderator_permissions: "Permissions Set", "Permissions Updated", "Permissions Removed"
- student_batch_history: "Batch Transfer Recorded", etc.
- companies: "Company Created", "Company Updated", "Company Deleted"

**getDescription** -- add contextual descriptions:
- company_memberships: show role and status changes (e.g., "Role: admin, Status: active")
- revenue_sources: show source name
- company_join_requests: show status and message
- moderator_permissions: summarize permission flags
- student_batch_history: show from/to batch info
- companies: show company name

**getEntityLink** -- no new navigable links needed (memberships and permissions don't have detail pages)

### 3. Audit Log Hook -- `src/hooks/useAuditLogs.ts`

No changes needed -- the hook is generic and queries `audit_logs` with filters. The new tables will automatically appear in query results.

### 4. CSV Export -- Already Generic

The export logic in `AuditLog.tsx` already exports all audit_logs rows matching the current filters. The new table entries will be included automatically. The `getActionLabel` and `getDescription` additions ensure exported CSVs have human-readable labels for the new event types.

## Technical Details

### Migration SQL (key parts)

```sql
-- Direct triggers for compatible tables
CREATE TRIGGER audit_company_memberships
  AFTER INSERT OR UPDATE OR DELETE ON public.company_memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_revenue_sources
  AFTER INSERT OR UPDATE OR DELETE ON public.revenue_sources
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_company_join_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.company_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Custom trigger for student_batch_history (no user_id column)
CREATE OR REPLACE FUNCTION public.audit_student_batch_history_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_record_id uuid;
  v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.transferred_by;
    v_record_id := OLD.id;
    v_company_id := OLD.company_id;
  ELSE
    v_user_id := NEW.transferred_by;
    v_record_id := NEW.id;
    v_company_id := NEW.company_id;
  END IF;

  SELECT email INTO v_user_email
    FROM public.user_profiles WHERE user_id = v_user_id LIMIT 1;

  INSERT INTO public.audit_logs
    (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data)
  VALUES (
    v_company_id, v_user_id, v_user_email,
    'student_batch_history', v_record_id, TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Similar custom triggers for moderator_permissions and companies
```

### Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Add 6 audit triggers (3 direct, 3 custom) |
| src/pages/AuditLog.tsx | Add table filter options, semantic labels, descriptions for 6 new tables |

### What Gets Audited After This

Every core business action will be tracked:
- Student CRUD, payments, batch transfers
- Batch and course CRUD
- Revenue and expense CRUD, source management
- Member add/remove/role change, join requests
- Moderator permission changes
- Company settings changes
- User role changes (already covered)
