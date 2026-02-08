
# Khata Balance Transfer Feature

## Overview
Add a feature to transfer balance from one khata (expense account) to another khata on the Expenses page. This will allow you to rebalance funds between your expense accounts without affecting the overall allocated amount.

## How it Will Work
1. A new "Transfer" button will appear in the Expenses page header (next to "Add Expense")
2. Clicking it opens a dialog where you select:
   - **From Khata**: The account to transfer money from
   - **To Khata**: The account to receive the money
   - **Amount**: How much to transfer
3. After confirming, the balances update immediately

## Implementation Details

### 1. Database Changes
Create a new `khata_transfers` table to track transfer history:
- `id` - Unique identifier
- `user_id` - Owner of the transfer
- `from_account_id` - Source khata
- `to_account_id` - Destination khata  
- `amount` - Transfer amount
- `description` - Optional note
- `created_at` - When the transfer occurred

Row-level security policies will ensure users can only see and manage their own transfers.

### 2. New Files

**`src/hooks/useKhataTransfers.ts`**
- `useKhataTransfers()` - Fetch all transfers for the user
- `useCreateKhataTransfer()` - Create a new transfer and invalidate balance caches

**`src/components/TransferDialog.tsx`**
A dialog with:
- Two dropdown selects for source/destination khatas
- Amount input field
- Optional description
- Validation to prevent:
  - Transferring to the same khata
  - Negative amounts
  - Transferring more than available balance (warning only)

### 3. Update Existing Files

**`src/pages/Expenses.tsx`**
- Add "Transfer" button next to "Add Expense"
- State management for the transfer dialog
- Toast notifications for success/error

**`src/hooks/useExpenses.ts`**
- Update `useAccountBalances()` to factor in transfers:
  - Add outgoing transfers to "spent"
  - Add incoming transfers to "allocated"

### 4. User Experience
- Transfer button with a swap icon for quick access
- Real-time balance preview showing projected balances after transfer
- Clear visual distinction between source (red indicator) and destination (green indicator)
- Transfer history will be accessible through the existing expense tracking system
