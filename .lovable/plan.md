

## Replace "Company" with "Business" and Fix Business Name in Settings

### Overview
Two changes: (1) The "Business Name" field in Settings will edit the active company's name instead of the user profile's `business_name`. (2) All user-visible occurrences of "company" will be renamed to "business" across the entire app.

### Changes

**1. Settings Page - Business Name edits company name (`src/pages/SettingsPage.tsx`)**
- Initialize `businessName` from `activeCompany?.name` instead of `user_profiles.business_name`
- On save, update `companies.name` (via `supabase.from("companies").update({ name: businessName })`) instead of `user_profiles.business_name`
- Invalidate company queries after save so sidebar reflects immediately
- Keep currency and fiscal month saving to `user_profiles` as before

**2. Rename "Company" to "Business" in user-facing text across all files:**

| File | Changes |
|------|---------|
| `src/components/AppLayout.tsx` | "Select Company" -> "Select Business", "My Companies" -> "My Businesses", "Join another company" -> "Join another business", "Create new company" -> "Create new business", "Switch Company" -> "Switch Business" |
| `src/pages/CompanySelection.tsx` | "Select a Company" -> "Select a Business", "Choose a company to continue" -> "Choose a business to continue", "Join Company" -> "Join Business", "Create Company" -> "Create Business" |
| `src/pages/CreateCompany.tsx` | "Create Company" heading/button -> "Create Business", "Company Name" -> "Business Name", "Company Logo" -> "Business Logo", "Set up a new company workspace" -> "Set up a new business workspace", placeholder "My Company" -> "My Business", "my-company" -> "my-business", "Users will search this slug to find your company" -> "...your business" |
| `src/pages/JoinCompany.tsx` | "Join a Company" -> "Join a Business", "Browse companies..." -> "Browse businesses...", "Company Password" -> "Business Password", "Ask the company admin..." -> "Ask the business admin...", "No companies found" -> "No businesses found", "Join Company" button -> "Join Business", "...provided by the company admin" -> "...provided by the business admin", "Joined successfully!" descriptions mentioning "company" -> "business" |
| `src/pages/CompanyMembers.tsx` | "Company Members" -> "Business Members", "Manage members, permissions, and join requests" stays, "This will revoke their access to this company" -> "...this business", "Manage invite codes and join password for this company" -> "...this business" |
| `src/components/CompanyJoinRequests.tsx` | "Company Join Requests" -> "Business Join Requests", "Select a company to view join requests" -> "Select a business...", "User has been added to the company" -> "...the business" |
| `src/pages/SettingsPage.tsx` | "Company Logo" -> "Business Logo", "Update the logo for {name}" -> "Update the logo for {name}", "Company logo updated" toast -> "Business logo updated" |
| `src/pages/LandingPage.tsx` | "Multi-Company Support" -> "Multi-Business Support", "Run multiple institutions from a single account..." stays, "Create Your Company" -> "Create Your Business", "Set up your institution in seconds..." stays |
| `src/pages/PendingApproval.tsx` | Any "company" references -> "business" |

Note: Internal code identifiers (variable names, query keys, context names, database columns) will NOT be renamed -- only user-facing strings (labels, headings, descriptions, placeholders, toasts).

### Technical Details

Settings page save logic change:
```typescript
// Before: saves to user_profiles
await supabase.from("user_profiles").update({ business_name: businessName }).eq("user_id", user.id);

// After: saves company name
await supabase.from("companies").update({ name: businessName }).eq("id", activeCompanyId);
// Then invalidate company queries
queryClient.invalidateQueries({ queryKey: ["user-companies"] });
refetchCompany();
```

The `businessName` state will be initialized from `activeCompany?.name` instead of fetching from `user_profiles`.

