

# Data Reset and Backup/Restore System

## Overview
Implement a secure data management system in the Settings page that allows users to:
1. **Backup Data** - Export all user data to a JSON file for safekeeping
2. **Restore Data** - Import previously backed up data to recover information
3. **Reset Data** - Permanently delete all user data with strong security measures

---

## Security Measures

The reset feature is destructive and irreversible. Multiple security layers will be implemented:

1. **Visual Warning** - Red danger zone section with clear warnings
2. **Confirmation Dialog** - Multi-step confirmation process
3. **Type-to-Confirm** - User must type "DELETE ALL DATA" exactly to enable the reset button
4. **Password Re-authentication** - User must enter their password before final deletion
5. **Cooldown Period** - 5-second countdown before reset can be executed

---

## Components to Create

### 1. Data Management Section Component (`src/components/DataManagementSection.tsx`)

A new card section for the Settings page containing:

- **Backup Data Button** - Downloads all user data as JSON
- **Restore Data Button** - Opens file picker to import backup
- **Danger Zone** - Visually distinct red-bordered section with Reset button

### 2. Reset Confirmation Dialog (`src/components/ResetDataDialog.tsx`)

Multi-step confirmation dialog:

```text
Step 1: Warning Screen
+----------------------------------------+
|  Warning: This action cannot be undone |
|                                        |
|  You are about to permanently delete:  |
|  - All revenues and allocations        |
|  - All expenses                        |
|  - All expense accounts (Khatas)       |
|  - All khata transfers                 |
|  - All revenue sources                 |
|                                        |
|  [Cancel]           [I Understand]     |
+----------------------------------------+

Step 2: Type Confirmation
+----------------------------------------+
|  Type "DELETE ALL DATA" to confirm     |
|                                        |
|  [__________________________]          |
|                                        |
|  [Cancel]           [Continue]         |
+----------------------------------------+

Step 3: Password Verification
+----------------------------------------+
|  Enter your password to proceed        |
|                                        |
|  [__________________________]          |
|                                        |
|  [Cancel]    [Reset All Data (5...)]   |
+----------------------------------------+
```

### 3. Restore Confirmation Dialog (`src/components/RestoreDataDialog.tsx`)

Confirmation dialog for data restoration:

```text
+----------------------------------------+
|  Restore from Backup                   |
|                                        |
|  This will ADD data from your backup.  |
|  Existing data will NOT be deleted.    |
|                                        |
|  Backup contains:                      |
|  - 5 expense accounts                  |
|  - 12 revenues                         |
|  - 45 expenses                         |
|  - 3 khata transfers                   |
|                                        |
|  [Cancel]           [Restore Data]     |
+----------------------------------------+
```

---

## Data Backup Format

The backup file will be a JSON file with the following structure:

```text
{
  "version": "1.0",
  "exportedAt": "2026-02-08T12:00:00Z",
  "userEmail": "user@example.com",
  "data": {
    "expense_accounts": [...],
    "revenue_sources": [...],
    "revenues": [...],
    "allocations": [...],
    "expenses": [...],
    "khata_transfers": [...]
  }
}
```

The filename format: `khata-backup-{date}.json`

---

## Utility Functions to Create

### `src/utils/dataBackupUtils.ts`

Functions for backup and restore operations:

```text
+------------------------------------------+
| exportUserData(userId)                   |
|   -> Fetches all user data from database |
|   -> Returns structured JSON object      |
+------------------------------------------+
| downloadBackup(data, userEmail)          |
|   -> Converts data to JSON string        |
|   -> Triggers browser download           |
+------------------------------------------+
| parseBackupFile(file)                    |
|   -> Reads and validates JSON file       |
|   -> Returns parsed data or error        |
+------------------------------------------+
| validateBackupData(data)                 |
|   -> Checks version compatibility        |
|   -> Validates data structure            |
|   -> Returns validation result           |
+------------------------------------------+
```

---

## Database Operations

### Reset Operation (order matters for foreign keys)

Data must be deleted in the correct order due to foreign key constraints:

1. Delete `allocations` (references revenues and expense_accounts)
2. Delete `khata_transfers` (references expense_accounts)
3. Delete `expenses` (references expense_accounts)
4. Delete `revenues` (references revenue_sources)
5. Delete `expense_accounts`
6. Delete `revenue_sources`

User profile is **NOT** deleted (preserves settings).

### Restore Operation

Data is inserted in reverse order:

1. Insert `expense_accounts`
2. Insert `revenue_sources`
3. Insert `revenues`
4. Insert `allocations`
5. Insert `expenses`
6. Insert `khata_transfers`

IDs are regenerated to avoid conflicts with existing data.

---

## Hook to Create

### `src/hooks/useDataManagement.ts`

Custom hook for data management operations:

```text
useDataManagement()
  |
  +-- exportData()
  |     Fetches and downloads all user data
  |
  +-- importData(file)
  |     Parses file and returns preview
  |
  +-- restoreData(parsedData)
  |     Inserts backup data into database
  |
  +-- resetAllData(password)
  |     Verifies password and deletes all data
  |
  +-- isExporting: boolean
  +-- isRestoring: boolean
  +-- isResetting: boolean
```

---

## Files to Create

1. `src/components/DataManagementSection.tsx` - Main UI section for Settings
2. `src/components/ResetDataDialog.tsx` - Multi-step reset confirmation
3. `src/components/RestoreDataDialog.tsx` - Restore confirmation with preview
4. `src/utils/dataBackupUtils.ts` - Backup/restore utility functions
5. `src/hooks/useDataManagement.ts` - Data management operations hook

## Files to Modify

1. `src/pages/SettingsPage.tsx` - Add DataManagementSection component

---

## Implementation Details

### Password Re-authentication

Uses the Supabase auth method to verify password:

```text
supabase.auth.signInWithPassword({
  email: user.email,
  password: enteredPassword
})
```

If successful, proceed with deletion. This ensures only the account owner can reset data.

### Visual Design

**Danger Zone Styling:**
- Red border around the section
- Red destructive button
- Warning icon
- Clear explanatory text

**Backup Section Styling:**
- Standard card styling
- Download and Upload icons
- Success/error toast notifications

---

## User Flow

### Backup Flow
1. User clicks "Backup Data" button
2. System fetches all user data
3. JSON file downloads automatically
4. Success toast notification

### Restore Flow
1. User clicks "Restore Data" button
2. File picker opens
3. User selects backup JSON file
4. System validates and shows preview dialog
5. User confirms restoration
6. Data is inserted
7. All queries are invalidated to refresh UI
8. Success toast notification

### Reset Flow
1. User clicks "Reset All Data" button
2. Warning dialog appears (Step 1)
3. User clicks "I Understand"
4. Type confirmation screen appears (Step 2)
5. User types "DELETE ALL DATA"
6. Password screen appears (Step 3)
7. User enters password
8. 5-second countdown begins
9. Data is deleted in correct order
10. All queries are invalidated
11. User redirected to Dashboard with empty state

---

## Implementation Order

1. Create utility functions (`dataBackupUtils.ts`)
2. Create data management hook (`useDataManagement.ts`)
3. Create restore dialog component
4. Create reset dialog component with multi-step flow
5. Create main data management section
6. Integrate into Settings page
7. Test all flows

