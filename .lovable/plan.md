

# Fix Rejection Reason Visibility and Remove Pending Spinner

## Problem
1. When an admin/cipher rejects a join request with a message, the new user cannot see the rejection reason on the Join Company page. The rejected requests query only fetches `company_id` and doesn't include `rejection_reason` or other details.
2. On the Join Company page, pending requests show a spinning loader icon next to the "Waiting for admin approval" text. The user wants to keep the message but remove the spinner.

## Changes

### 1. `src/pages/JoinCompany.tsx`

**Fix rejected request data fetching (lines 108-120):**
- Change the `my-rejected-join-requests-ids` query to fetch full details: `id, company_id, rejection_reason, reviewed_at, status` instead of just `company_id`
- Store the full objects instead of just an array of IDs

**Show rejection reason in the browse list (lines 485-488):**
- When a company is marked as rejected, display the rejection reason (if provided) below the "Rejected" badge or as a tooltip/subtitle
- Also show rejection reason in the `handleSelectCompany` toast (lines 287-294)

**Update rejection checks:**
- Update all places that check `rejectedRequests.includes(company.id)` to work with the new data shape (array of objects instead of array of IDs)

**Remove spinner from pending requests (line 370):**
- Remove the `<Loader2 className="h-3 w-3 animate-spin" />` icon from the pending request card text, keeping just the "Waiting for admin approval..." message

## Technical Details

- The `CompanySelection.tsx` page already displays rejection reasons correctly (line 227-229) -- this fix brings the same visibility to the `JoinCompany.tsx` page
- The rejected requests data structure changes from `string[]` (company IDs) to full objects with `rejection_reason` field
- A helper like `rejectedRequestMap` (keyed by `company_id`) will make lookups efficient for both the disabled check and reason display
- No database or RLS changes needed -- the `company_join_requests` table already has `rejection_reason` and the user can already read their own requests via the existing SELECT policy

## Files Modified
- `src/pages/JoinCompany.tsx`
