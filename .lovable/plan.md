

# Addopanto Flow - Comprehensive Testing and Security Audit Plan

## Executive Summary

This document outlines an exhaustive testing strategy for Addopanto Flow, a multi-tenant financial management system handling sensitive student payment data. The plan covers 5 phases across functional, security, performance, regression, and production readiness domains.

---

## Phase 1: Critical Path Functional Testing (Week 1-2)

### 1.1 Authentication and Registration

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| AUTH-01 | Sign up with valid email and password | Pending registration request created, user sees PendingApproval page | Critical |
| AUTH-02 | Sign up with duplicate email | Error message displayed, no duplicate record | Critical |
| AUTH-03 | Sign up with weak password | Validation error shown | High |
| AUTH-04 | Sign in with correct credentials (approved user) | Redirect to dashboard with correct role | Critical |
| AUTH-05 | Sign in with banned email (within 24hr window) | Blocked with ban message | Critical |
| AUTH-06 | Sign in with rejected registration | Rejected status alert shown | High |
| AUTH-07 | Sign in with pending registration | Pending status shown | High |
| AUTH-08 | Password reset flow end-to-end | Reset email sent, new password works | High |
| AUTH-09 | Session persistence across browser refresh | User remains logged in | High |
| AUTH-10 | Auto-logout when user_role is deleted (realtime) | Forced logout within seconds | Critical |
| AUTH-11 | Auto-logout fallback (60s polling) when realtime misses deletion | Forced logout within 60s | High |
| AUTH-12 | Token refresh before expiration | Session continues seamlessly | High |
| AUTH-13 | Concurrent sessions in multiple tabs | All tabs stay in sync | Medium |
| AUTH-14 | Google OAuth sign-in still requires approval | Registration request created, not auto-approved | Critical |

### 1.2 Role-Based Access Control

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| RBAC-01 | Cipher user sees all nav items including Platform Users | Full navigation visible | Critical |
| RBAC-02 | Company Admin sees Settings, Requests, Members but NOT Platform Users | Correct nav items | Critical |
| RBAC-03 | Moderator sees only permitted features based on company_memberships permissions | Restricted access | Critical |
| RBAC-04 | Viewer (user role) sees read-only views | No add/edit/delete buttons visible | Critical |
| RBAC-05 | Cipher user is hidden from member lists (stealth mode) | Not visible in Members page to non-cipher users | Critical |
| RBAC-06 | Admin cannot manage other admins or ciphers | Action buttons hidden/disabled | High |
| RBAC-07 | Admin can manage moderators (change permissions, remove) | Actions succeed | High |
| RBAC-08 | Moderator with can_add_revenue=true can add revenue | Insert succeeds | High |
| RBAC-09 | Moderator with can_add_revenue=false cannot add revenue | Button hidden, RLS blocks if forced | Critical |
| RBAC-10 | Direct URL access to /users by non-cipher user | Redirected or access denied | Critical |
| RBAC-11 | RoleGuard component blocks rendering for unauthorized roles | Fallback shown | High |
| RBAC-12 | PermissionGuard checks company-scoped permissions correctly | Feature hidden when no permission | High |

### 1.3 Multi-Business (Company) System

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| BIZ-01 | Create new business with name, slug, logo, password | Business created, user is admin | Critical |
| BIZ-02 | Create business with duplicate slug | Error shown | High |
| BIZ-03 | Join business with correct password | Join request created | Critical |
| BIZ-04 | Join business with wrong password | Error shown, no request created | High |
| BIZ-05 | Join business with invite code | Join request created | High |
| BIZ-06 | Admin approves join request with permissions | Membership created with correct permissions | Critical |
| BIZ-07 | Admin rejects join request | 24hr ban enforced for that business, user logged out | Critical |
| BIZ-08 | Switch between businesses | Data isolation - only active business data shown | Critical |
| BIZ-09 | Rapid business switching (5+ times quickly) | No stale data flash, correct data always shown | High |
| BIZ-10 | Business logo upload (valid image) | Logo stored in company-logos bucket, URL saved | High |
| BIZ-11 | Business settings update (name, currency, fiscal year) | Changes reflect in sidebar immediately | High |
| BIZ-12 | Cipher user joins any business instantly as Admin | Instant membership, no approval needed | Critical |

### 1.4 Batch Management

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| BATCH-01 | Create batch with all fields | Batch created with correct company_id | Critical |
| BATCH-02 | Create batch with end_date before start_date | Validation trigger rejects | High |
| BATCH-03 | Edit batch details | Updated successfully, students see updated defaults | High |
| BATCH-04 | Delete batch with enrolled students | Proper handling (error or cascade) | High |
| BATCH-05 | Batch date filter (Monthly, Custom Range, All Time) | Stats recalculate correctly | High |
| BATCH-06 | Batch detail table shows correct ratio badges (Partial, Overdue, Pending) | Accurate calculations | High |
| BATCH-07 | Summary cards show overdue amounts in currency | Correct financial figures | High |

### 1.5 Student Management

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| STU-01 | Add student to batch | Student created with batch_id, inherits batch defaults | Critical |
| STU-02 | Add student with custom fees (overriding batch defaults) | Custom fees used in calculations | High |
| STU-03 | Add student with zero fees (falls back to batch defaults) | Effective fees = batch defaults | High |
| STU-04 | Edit student details | Updated, payment calculations adjust | High |
| STU-05 | Delete student | Student and related payments/revenues cascade deleted | High |
| STU-06 | Student detail page shows correct payment history | All payments listed with correct totals | High |
| STU-07 | Student month grid shows paid/unpaid/partial status per month | Visual accuracy | Medium |

### 1.6 Payment Recording

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| PAY-01 | Record admission fee payment | Payment created, revenue auto-created via trigger, allocations calculated | Critical |
| PAY-02 | Record monthly fee payment for specific months | months_covered array populated, revenue synced | Critical |
| PAY-03 | Payment amount exceeds batch-defined fee limit | Validation prevents overpayment | Critical |
| PAY-04 | Payment auto-fill logic in dialog | Correct defaults populated | Medium |
| PAY-05 | Edit payment amount | Revenue and allocations recalculated via trigger | Critical |
| PAY-06 | Delete payment | Linked revenue cascade deleted, allocations removed | Critical |
| PAY-07 | Payment reflects on dashboard, batch totals, student detail, reports simultaneously | Cross-page consistency | Critical |
| PAY-08 | Concurrent payments from two users for same student | No race condition, no double-counting | Critical |

### 1.7 Revenue and Expenses

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| REV-01 | Add manual revenue entry | Revenue created with correct source and company_id | High |
| REV-02 | Revenue allocations distribute to expense accounts by percentage | Correct allocation amounts | Critical |
| REV-03 | Add expense against an expense account | Balance updates correctly | High |
| REV-04 | Khata transfer between accounts | Source debited, destination credited | Critical |
| REV-05 | Expense account balance = allocations - expenses +/- transfers | Accurate running balance | Critical |
| REV-06 | Student payment auto-creates "Student Fees" revenue source if missing | Source created automatically | High |

### 1.8 Dashboard and Reports

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| DASH-01 | Dashboard shows correct total revenue, expenses, balances for active business | Accurate figures | Critical |
| DASH-02 | Reports page filters by date range | Correct filtered results | High |
| DASH-03 | Export to PDF/CSV | File downloads with correct data | Medium |
| DASH-04 | Charts render with correct data | Visual accuracy | Medium |

### 1.9 Real-Time Synchronization

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| RT-01 | User A adds revenue, User B sees update within 3s | Toast notification + data refresh | High |
| RT-02 | Payment recorded by User A updates User B's dashboard | Cache invalidated for all related queries | Critical |
| RT-03 | Toast shows "updated by another user" only for OTHER users' changes | Own changes don't trigger toast | Medium |
| RT-04 | Rapid changes from multiple users debounce into single notification | Batch notification within 1.5s | Medium |

---

## Phase 2: Security Audit and Penetration Testing (Week 2-3)

### 2.1 Authentication Security

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| SEC-AUTH-01 | JWT token validation on all edge functions using getClaims() | Unauthorized requests return 401 | Critical |
| SEC-AUTH-02 | Expired JWT token rejected | 401 response | Critical |
| SEC-AUTH-03 | Tampered JWT token rejected | 401 response | Critical |
| SEC-AUTH-04 | Company join passwords encrypted with bcrypt | Plaintext never stored | Critical |
| SEC-AUTH-05 | Password not exposed in API responses or companies_public view | Only hashed in companies table (RLS protected) | Critical |
| SEC-AUTH-06 | Invite codes not exposed in companies_public view | View excludes sensitive columns | Critical |
| SEC-AUTH-07 | check-ban edge function validates properly | Banned users blocked | High |
| SEC-AUTH-08 | Leaked password protection enabled in auth settings | Passwords checked against HaveIBeenPwned | High |

### 2.2 Authorization and Data Isolation

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| SEC-ISO-01 | User queries students with different company_id via API | RLS blocks, empty result | Critical |
| SEC-ISO-02 | User attempts to insert revenue with another company's company_id | RLS rejects insert | Critical |
| SEC-ISO-03 | get_active_company_id() used in all financial table RLS policies | Verified in all policies | Critical |
| SEC-ISO-04 | is_company_member() check on all SELECT policies | Verified | Critical |
| SEC-ISO-05 | company_can_edit_delete() on all UPDATE/DELETE policies | Verified | Critical |
| SEC-ISO-06 | Moderator cannot escalate own permissions | RLS prevents self-update on company_memberships | Critical |
| SEC-ISO-07 | Non-cipher user cannot see cipher users in any listing | can_view_user() function enforces | Critical |
| SEC-ISO-08 | Direct Supabase REST API call bypassing frontend still respects RLS | All policies server-enforced | Critical |
| SEC-ISO-09 | admin-users edge function restricted to authorized callers | Proper auth check | Critical |

### 2.3 Input Validation and Injection Prevention

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| SEC-INJ-01 | SQL injection in student name field | Parameterized query prevents injection | Critical |
| SEC-INJ-02 | SQL injection in search/filter fields | No injection possible | Critical |
| SEC-INJ-03 | XSS payload in description fields | Sanitized, not rendered as HTML | Critical |
| SEC-INJ-04 | XSS in business name | Escaped in sidebar and all displays | Critical |
| SEC-INJ-05 | Script tags in batch notes | Not executed | High |
| SEC-INJ-06 | Extremely long input (10000+ chars) in text fields | Length validation or graceful handling | Medium |
| SEC-INJ-07 | Special characters in slug field | Properly sanitized | High |

### 2.4 File Upload Security

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| SEC-FILE-01 | Upload .exe disguised as .png for company logo | Rejected by MIME type check | Critical |
| SEC-FILE-02 | Upload oversized image (50MB+) | Size limit enforced | High |
| SEC-FILE-03 | Upload SVG with embedded script | Sanitized or rejected | Critical |
| SEC-FILE-04 | Storage bucket RLS prevents accessing other users' avatars for modification | Only own files modifiable | High |
| SEC-FILE-05 | Company logo bucket is public (read) but write-restricted | Verified | High |

### 2.5 API and Edge Function Security

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| SEC-API-01 | All edge functions have verify_jwt=false and use getClaims() | Verified in config.toml and code | Critical |
| SEC-API-02 | CORS headers properly configured on edge functions | Only allowed origins | High |
| SEC-API-03 | Rate limiting on login endpoint | Brute force prevented | Critical |
| SEC-API-04 | Rate limiting on company join attempts | Abuse prevented | High |
| SEC-API-05 | No sensitive data in error responses | Generic error messages | High |
| SEC-API-06 | Service role key never exposed to client | Only in edge functions via Deno.env | Critical |

### 2.6 Row-Level Security Comprehensive Audit

| ID | Table | SELECT | INSERT | UPDATE | DELETE | Severity |
|----|-------|--------|--------|--------|--------|----------|
| RLS-01 | students | is_company_member | company_can_add_revenue | company_can_edit_delete | company_can_edit_delete | Critical |
| RLS-02 | student_payments | is_company_member | company_can_add_revenue | company_can_edit_delete | company_can_edit_delete | Critical |
| RLS-03 | revenues | is_company_member | company_can_add_revenue | company_can_edit_delete | company_can_edit_delete | Critical |
| RLS-04 | expenses | is_company_member | company_can_add_expense | company_can_edit_delete | company_can_edit_delete | Critical |
| RLS-05 | expense_accounts | is_company_member | company_can_add_expense_source | company_can_edit_delete | company_can_edit_delete | Critical |
| RLS-06 | allocations | is_company_member | company_can_add_revenue | company_can_edit_delete | company_can_edit_delete | Critical |
| RLS-07 | khata_transfers | is_company_member | company_can_transfer | company_can_edit_delete | company_can_edit_delete | Critical |
| RLS-08 | batches | is_company_member | company_can_add_revenue | company_can_edit_delete | company_can_edit_delete | Critical |
| RLS-09 | companies | cipher/admin only | cipher only | cipher/admin | cipher only | Critical |
| RLS-10 | company_memberships | member/admin/mod | admin/cipher | admin/cipher | admin/cipher | Critical |
| RLS-11 | user_roles | own + admin/cipher | cipher + admin(mod only) | cipher + admin(mod only) | cipher + admin(mod only) | Critical |
| RLS-12 | user_profiles | own + admin/cipher + co-members | own | own | BLOCKED | Critical |
| RLS-13 | registration_requests | own + admin/cipher | own | admin/cipher | BLOCKED | Critical |
| RLS-14 | company_join_requests | own + admin/cipher | own | admin/cipher | BLOCKED | Critical |
| RLS-15 | moderator_permissions | own + admin/cipher | admin/cipher | admin/cipher (not cipher targets) | admin/cipher (not cipher targets) | Critical |
| RLS-16 | monthly_fee_history | is_company_member | company_can_add_revenue | company_can_edit_delete | company_can_edit_delete | Critical |

All policies use SECURITY DEFINER helper functions to prevent infinite recursion -- verified.

---

## Phase 3: Performance and Scalability Testing (Week 3-4)

### 3.1 Page Load Performance

| ID | Test Case | Target | Severity |
|----|-----------|--------|----------|
| PERF-01 | Dashboard load with 1000+ students in active business | Less than 2s | High |
| PERF-02 | Batch detail page with 500+ students | Less than 2s | High |
| PERF-03 | Students list with pagination (50 per page) | Less than 1s | High |
| PERF-04 | Reports page with 12 months of data | Less than 3s | Medium |
| PERF-05 | Business selection page with 50+ businesses | Less than 1s | Medium |
| PERF-06 | Revenue page with 5000+ records | Pagination works, less than 2s per page | High |

### 3.2 API Response Times

| ID | Test Case | Target | Severity |
|----|-----------|--------|----------|
| PERF-07 | GET students by company_id (indexed) | Less than 100ms | High |
| PERF-08 | GET student_payments by student_id | Less than 100ms | High |
| PERF-09 | Aggregate dashboard queries | Less than 200ms | High |
| PERF-10 | INSERT student_payment (triggers revenue + allocations) | Less than 500ms | High |

### 3.3 Concurrency

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| PERF-11 | 100 concurrent users querying dashboard | All respond within 5s | High |
| PERF-12 | 10 concurrent payment inserts for different students | All succeed, no deadlocks | Critical |
| PERF-13 | 5 concurrent payment inserts for same student | Serialized correctly, no double-count | Critical |

### 3.4 Database Optimization

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| PERF-14 | Verify indexes on company_id across all tables | Indexes exist | High |
| PERF-15 | Verify indexes on batch_id, student_id, payment_date | Indexes exist | High |
| PERF-16 | Check for N+1 queries in hooks (useStudents, useRevenues, etc.) | No N+1 patterns | High |
| PERF-17 | Query plan analysis on dashboard aggregation queries | Sequential scans avoided on large tables | Medium |
| PERF-18 | Supabase 1000-row default limit doesn't truncate results silently | Pagination implemented where needed | High |

### 3.5 Frontend Performance

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| PERF-19 | React DevTools profiler -- no unnecessary re-renders on data pages | Minimal wasted renders | Medium |
| PERF-20 | Memory leak detection after 30min session with navigation | Stable memory usage | Medium |
| PERF-21 | Bundle size analysis | Under 500KB gzipped | Low |

---

## Phase 4: Edge Cases and Regression Testing (Week 4)

### 4.1 Edge Cases

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| EDGE-01 | Create batch with same name in same business | Allowed (only batch_code unique per company) or proper error | Medium |
| EDGE-02 | Join business with wrong password 10+ times | Rate limited or banned | High |
| EDGE-03 | Record payment exactly at fee limit boundary | Accepted, total equals limit exactly | High |
| EDGE-04 | Record payment that would exceed fee limit by 1 | Rejected with clear error | High |
| EDGE-05 | Delete last admin of a business | Prevented or warning | Critical |
| EDGE-06 | Switch businesses 20 times in 10 seconds | No crashes, correct data shown | High |
| EDGE-07 | Upload 10MB image as business logo | Handled gracefully (resize or reject) | Medium |
| EDGE-08 | Enter 5000-char description in forms | Truncated or validated | Low |
| EDGE-09 | Unicode/emoji in student names | Stored and displayed correctly | Low |
| EDGE-10 | Handle deleted/inactive batch gracefully | Students still accessible, no crashes | High |
| EDGE-11 | Access student detail for deleted student (stale URL) | 404 or redirect | Medium |
| EDGE-12 | Backup file from different version (non-1.0) | Validation rejects with clear message | Medium |
| EDGE-13 | Restore backup from different user/business | Proper handling (reject or map) | High |
| EDGE-14 | Reset data with incorrect confirmation text | Button remains disabled | High |
| EDGE-15 | Reset data without re-authentication | Blocked | Critical |

### 4.2 Regression Tests

| ID | Test Case | Severity |
|----|-----------|----------|
| REG-01 | User approval flow still works after batch system addition | Critical |
| REG-02 | Payment recording accuracy unaffected by "Company to Business" rename | Critical |
| REG-03 | Business data isolation intact after permission system updates | Critical |
| REG-04 | Cipher stealth mode works across Members, Platform Users, Settings | Critical |
| REG-05 | Realtime sync works after table schema changes | High |
| REG-06 | Export/backup includes all tables after schema additions | High |

---

## Phase 5: Production Readiness (Week 4-5)

### 5.1 Data Privacy and Compliance

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| PRIV-01 | No sensitive data (passwords, tokens) in console.log | Clean logs | Critical |
| PRIV-02 | API responses don't leak other users' data | Verified via RLS | Critical |
| PRIV-03 | Backup JSON doesn't contain other users' data | Scoped to company | Critical |
| PRIV-04 | Audit trail for financial transactions | All mutations tracked with user_id and timestamps | High |
| PRIV-05 | Data deletion removes all related records (cascade) | No orphaned data | High |

### 5.2 Browser Compatibility

| ID | Browser/Platform | Severity |
|----|------------------|----------|
| COMPAT-01 | Chrome (latest) on Windows/macOS | Critical |
| COMPAT-02 | Firefox (latest) | High |
| COMPAT-03 | Safari (latest) on macOS | High |
| COMPAT-04 | Edge (latest) | Medium |
| COMPAT-05 | iOS Safari | High |
| COMPAT-06 | Android Chrome | High |

### 5.3 UX and Accessibility

| ID | Test Case | Expected Result | Severity |
|----|-----------|-----------------|----------|
| A11Y-01 | Keyboard navigation through all forms and modals | Tab order logical, Enter submits | High |
| A11Y-02 | Screen reader reads form labels and errors | ARIA labels present | Medium |
| A11Y-03 | Color contrast WCAG AA on all text | 4.5:1 minimum ratio | Medium |
| A11Y-04 | Mobile responsive on 360px width | All features usable | High |
| A11Y-05 | Touch targets minimum 44px | Buttons and links adequate size | Medium |
| A11Y-06 | Loading states visible on all async operations | Skeleton loaders or spinners shown | Medium |
| A11Y-07 | Empty states for all lists | Helpful message when no data | Low |

### 5.4 Deployment Checklist

| ID | Item | Status |
|----|------|--------|
| DEPLOY-01 | Environment variables secure (not in client bundle except VITE_ prefixed) | -- |
| DEPLOY-02 | HTTPS enforced on published URL | -- |
| DEPLOY-03 | CORS configured on edge functions | -- |
| DEPLOY-04 | Error boundary catches React crashes | -- |
| DEPLOY-05 | 404 page handles unknown routes | -- |
| DEPLOY-06 | Service role key only in edge functions (server-side) | -- |
| DEPLOY-07 | Realtime publication enabled for required tables | -- |
| DEPLOY-08 | Storage buckets have correct public/private settings | -- |
| DEPLOY-09 | Database connection pooling configured | -- |
| DEPLOY-10 | Rollback plan documented | -- |

---

## Automated Testing Recommendations

### Unit Tests (Vitest -- already configured)
- `src/utils/currencyUtils.ts` -- currency formatting
- `src/utils/dateRangeUtils.ts` -- date range calculations
- `src/utils/exportUtils.ts` -- export data formatting
- `src/utils/dataBackupUtils.ts` -- backup validation, parsing
- Fee calculation logic (effective fees, batch defaults fallback)
- Role hierarchy checks (`hasRoleLevel`, `canManageRole`)

### Integration Tests
- Edge functions (admin-users, check-ban, company-join) using `supabase--test-edge-functions`
- Database trigger `sync_student_payment_revenue` -- insert/update/delete paths
- RLS policy verification queries

### E2E Tests (Playwright recommended)
- Signup -> Approval -> Login -> Create Business -> Add Batch -> Add Student -> Record Payment -> Verify Dashboard
- Join Business flow with password and approval
- Multi-user concurrent payment recording
- Business switching with data isolation verification

### CI Pipeline
- Run Vitest unit tests on every commit
- Run edge function tests on every commit
- E2E tests on staging before production deploy

---

## Execution Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Week 1-2 | Critical path functional testing (AUTH, RBAC, payments, data flow) |
| Phase 2 | Week 2-3 | Security audit, RLS verification, penetration testing |
| Phase 3 | Week 3-4 | Performance benchmarks, load testing, database optimization |
| Phase 4 | Week 4 | Edge cases, regression testing |
| Phase 5 | Week 4-5 | Production readiness, accessibility, deployment checklist |

---

## Test Case Tracking Template

For each test case during execution:

```text
ID:          [TEST-ID]
Description: [What is being tested]
Steps:       [Step-by-step procedure]
Expected:    [Expected outcome]
Actual:      [Fill during testing]
Status:      [PASS / FAIL / BLOCKED / SKIPPED]
Severity:    [Critical / High / Medium / Low]
Assignee:    [Tester name]
Notes:       [Any observations]
```

---

## Monitoring Post-Launch

- Error tracking via application ErrorBoundary component (already implemented)
- Realtime sync health monitoring (channel connection status)
- Database query performance via Lovable Cloud backend analytics
- User session validation polling (60s interval already implemented)
- Toast notification system for cross-user data changes (already implemented)

