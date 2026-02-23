
# Add Performance Score KPI to Employee Detail Header

## Overview
Surface the Performance Score as a prominent, always-visible KPI badge directly on the Employee Detail header card (next to the employee name/info), so users get an at-a-glance performance indicator without navigating to the Performance tab.

## What Changes

### Employee Detail Header Card (`src/pages/EmployeeDetail.tsx`)
Add a compact color-coded Performance Score indicator to the header card area (between the employee info and action buttons):

- A small radial ring (40x40px) showing the score with color-coded bands:
  - **Green** (80-100): "Excellent"
  - **Orange** (50-79): "Good" 
  - **Red** (0-49): "Needs Improvement"
- Displayed inline next to the employee details in the header
- Shows a loading skeleton while data fetches
- Score value and label are clickable, scrolling/switching to the Performance tab for details

### Visual Layout
The header will look like:

```text
[Avatar]  Employee Name  [Status Badge]  [Score Ring 85 Excellent]   [Eye Toggle] [Edit]
          EMP-001 . Designer . Design
          Full Time . Joined 15 Jan 2024
```

## Technical Details

### File: `src/pages/EmployeeDetail.tsx`

**Additions to the header card (lines ~237-243):**
- Insert a compact score ring + label after the employee text info, inside the `flex-1` div or as a sibling element
- Reuse the existing `scoreColor`, `scoreLabel`, `circumference`, and `strokeDashoffset` variables already computed at lines 217-221
- Reuse the existing `perf` data from `useEmployeePerformance` hook already called in the component
- Add an `onClick` handler that switches the active tab to "performance" (convert `Tabs` to controlled mode with `value` state if not already)

**Controlled Tabs:**
- Add `const [activeTab, setActiveTab] = useState("profile")` state
- Update `<Tabs defaultValue="profile">` to `<Tabs value={activeTab} onValueChange={setActiveTab}>`
- Score badge click calls `setActiveTab("performance")`

**No new files, hooks, or database changes needed** -- all data is already fetched by the existing `useEmployeePerformance` hook.

### Files Modified
- `src/pages/EmployeeDetail.tsx` -- add compact score KPI to header card, convert tabs to controlled mode
