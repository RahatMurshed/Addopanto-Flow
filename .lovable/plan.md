

# Implement Export PDF Report and Manage Tags for Student Profile

## Overview
Both features are currently disabled placeholders in the QuickActionsPanel. The backend infrastructure exists for both -- we just need to wire up the frontend.

## 1. Export PDF Report

Generate a downloadable PDF of the student's profile including personal info, enrollment timeline, and financial summary.

**Approach:**
- Use the existing `html2canvas` + `jspdf` pattern already used elsewhere in the app
- Capture the student profile's main content area (left column) as a canvas, then render to a multi-page A4 PDF
- Follow the existing PDF export convention: light theme, business name in header, no interactive elements
- Replace the disabled button with a working one that triggers the export

**Changes:**
- `QuickActionsPanel.tsx`: Replace the disabled "Export PDF Report" action with a functional one that calls a new `handleExportPdf` function
- Create `src/components/students/profile/StudentPdfExport.ts` utility with the export logic:
  - Temporarily force light theme on the capture target
  - Add a header with company name + student name + date
  - Use A4-sized canvas slicing for multi-page support
  - Download as `Student_Report_[Name]_[Date].pdf`

## 2. Manage Tags

Allow admins to assign/remove tags on a student. The DB tables `student_tags` and `student_tag_assignments` already exist.

**Approach:**
- Create a dialog/popover that shows all company tags with checkboxes
- Allow assigning/unassigning tags to the current student
- Include an inline "Create Tag" option for adding new tags on the fly
- Only available to Admin/Cipher roles (already gated)

**Changes:**
- Create `src/hooks/useStudentTags.ts`:
  - `useCompanyTags(companyId)` -- fetch all tags for the company
  - `useStudentTagAssignments(studentId)` -- fetch assigned tags for a student
  - `useAssignTag` / `useUnassignTag` mutations
  - `useCreateTag` mutation for creating new tags inline
- Create `src/components/students/profile/ManageTagsDialog.tsx`:
  - Dialog with a list of company tags as checkboxes
  - Checked = assigned to student, unchecked = not assigned
  - "Add new tag" input at the bottom for creating tags inline
  - Tags shown as colored badges after assignment
- `QuickActionsPanel.tsx`:
  - Replace the disabled "Manage Tags" action with a functional one
  - Add state for dialog open/close
  - Pass student ID and company ID to the dialog

## 3. Display Assigned Tags on Profile Header

- `ProfileHeader.tsx`: Show assigned tags as small badges below the student name so they're visible at a glance

## Technical Details

**Files to create:**
- `src/hooks/useStudentTags.ts` -- hooks for tag CRUD
- `src/components/students/profile/ManageTagsDialog.tsx` -- tag management UI
- `src/components/students/profile/StudentPdfExport.ts` -- PDF generation utility

**Files to modify:**
- `src/components/students/profile/QuickActionsPanel.tsx` -- enable both buttons, wire up handlers
- `src/components/students/profile/ProfileHeader.tsx` -- display assigned tags

**No database migrations needed** -- the `student_tags` and `student_tag_assignments` tables already exist with RLS policies.

