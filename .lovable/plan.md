

# Enhance Batch Detail Summary Section

## Current State
The batch detail page has 4 summary cards: Students, Collected, Pending, and Completion (payment collection %). While useful, several additional insights would help batch administrators make quicker decisions.

## Proposed Enhancements

### 1. Admission vs Monthly Breakdown (Replace or Enhance Existing Cards)
Split the Collected and Pending cards to show a quick breakdown:
- **Collected card**: Add a small subtitle showing "Admission: X | Monthly: Y"
- **Pending card**: Same breakdown so admins know whether the gap is in admission fees or monthly fees

### 2. Add "Overdue" Stat to Summary Cards
Currently there's an overdue alert banner below the cards, but adding a dedicated **Overdue Amount** card (or merging it into the grid) gives immediate visibility:
- Show the total overdue amount in red
- Show number of students with overdue payments
- This replaces the separate alert banner, keeping all stats in one row

### 3. Add "This Month" Collection Card
Show how much has been collected for the current month specifically:
- "This Month: X/Y collected" with a mini progress bar
- Helps track current month's collection drive

### 4. Enhance Completion Card with Dual Progress
Show two progress bars instead of one:
- **Admission completion** (e.g., 75% of students fully paid admission)
- **Monthly completion** (e.g., 40% of due months paid)
- This gives a clearer picture than a single blended percentage

### 5. Add Expected Revenue Card
Show the total expected revenue for the batch based on batch defaults:
- Formula: (students x admission_fee) + (students x monthly_fee x duration_months)
- Gives a clear revenue target for the batch

## Recommended Combination
To avoid clutter, I recommend this 5-card layout (expanding from 4 to 5, or keeping 4 with enhanced content):

| Card | Content |
|------|---------|
| Students | Count + capacity (existing) |
| Collected | Total collected + admission/monthly split below |
| Pending | Total pending + overdue amount highlighted in red |
| This Month | Current month collection with mini progress |
| Completion | Dual progress bars for admission % and monthly % |

## Technical Details

### Files to Modify
- **`src/pages/BatchDetail.tsx`** - Update summary cards section (lines 286-332)

### Key Computations to Add

```text
// Admission breakdown
admissionCollected = sum of all admissionPaid
admissionPending = sum of all (effAdmission - admissionPaid)

// Monthly breakdown  
monthlyCollected = sum of all monthlyPaid
monthlyPending = sum of all (monthlyTotal - monthlyPaid)

// Overdue amount
overdueAmount = sum of overdue months' fees across all students

// This month stats
currentMonthDue = students with current month in their range
currentMonthPaid = students who paid current month

// Completion split
admissionCompletion% = students with admission fully paid / total students
monthlyCompletion% = total months paid / total months due (across all students)
```

### Layout Change
- Grid changes from `lg:grid-cols-4` to `lg:grid-cols-5` (or stays at 4 with richer card content)
- Each card gets a secondary line of smaller text for the breakdown
- Completion card gets two `<Progress>` bars with labels

### Overdue Alert Banner
- Remove the standalone overdue alert card (lines 335-344)
- Integrate overdue count and amount into the Pending card with red text

