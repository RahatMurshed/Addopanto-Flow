
# Comprehensive Student Management System

## Overview
This plan enhances the existing student module with detailed profiles (30+ new fields), a 5-step wizard form, CSV/Excel bulk import, advanced search/filtering, batch assignment capabilities, and a global command palette -- all optimized for 10,000-20,000 records.

Due to the massive scope, this will be implemented in **4 phases** across multiple messages.

---

## Phase 1: Database Schema + Extended Student Fields

### 1A. Database Migration -- New Columns on `students` Table

Add the following columns (all nullable except where noted):

**Personal:**
- `date_of_birth` (date)
- `gender` (text)
- `blood_group` (text)
- `religion_category` (text)
- `nationality` (text)
- `aadhar_id_number` (text)

**Contact:**
- `whatsapp_number` (text)
- `alt_contact_number` (text)
- `address_house` (text)
- `address_street` (text)
- `address_area` (text)
- `address_city` (text)
- `address_state` (text)
- `address_pin_zip` (text)
- `permanent_address_same` (boolean, default true)
- `perm_address_house`, `perm_address_street`, `perm_address_area`, `perm_address_city`, `perm_address_state`, `perm_address_pin_zip` (text)

**Family:**
- `father_name` (text)
- `father_occupation` (text)
- `father_contact` (text)
- `father_annual_income` (numeric)
- `mother_name` (text)
- `mother_occupation` (text)
- `mother_contact` (text)
- `guardian_name` (text)
- `guardian_contact` (text)
- `guardian_relationship` (text)

**Academic:**
- `previous_school` (text)
- `class_grade` (text)
- `roll_number` (text)
- `academic_year` (text)
- `section_division` (text)
- `previous_qualification` (text)
- `previous_percentage` (text)
- `board_university` (text)

**Additional:**
- `special_needs_medical` (text)
- `emergency_contact_name` (text)
- `emergency_contact_number` (text)
- `transportation_mode` (text)
- `distance_from_institution` (text)
- `extracurricular_interests` (text)
- `language_proficiency` (text)

### 1B. New `student_siblings` Table

```text
student_siblings
  id (uuid PK)
  student_id (uuid FK -> students.id ON DELETE CASCADE)
  company_id (uuid FK -> companies.id)
  name (text)
  age (integer)
  occupation_school (text)
  contact (text)
  created_at (timestamptz)
```

RLS: Same pattern as students table -- company member can view, authorized users can insert/update/delete.

### 1C. Database Indexes for Performance

```text
CREATE INDEX idx_students_company_name ON students(company_id, name);
CREATE INDEX idx_students_company_father ON students(company_id, father_name);
CREATE INDEX idx_students_company_phone ON students(company_id, phone);
CREATE INDEX idx_students_company_class ON students(company_id, class_grade);
CREATE INDEX idx_students_company_batch ON students(company_id, batch_id);
CREATE INDEX idx_students_company_created ON students(company_id, created_at);
CREATE INDEX idx_students_company_status ON students(company_id, status);
```

---

## Phase 2: 5-Step Student Wizard Form

Replace the current `StudentDialog` with a multi-step wizard dialog:

### Step 1: Personal Information
- Full Name (required), Date of Birth (required, calendar picker), Gender (select), Blood Group (select), Religion/Category, Nationality, Aadhar/ID Number

### Step 2: Contact Information
- Mobile Number (required), WhatsApp Number, Alt Contact, Email
- Current Address fields (House/Flat, Street, Area, City, State, PIN/ZIP)
- Checkbox "Same as Current Address" for permanent address
- Conditional permanent address fields

### Step 3: Family Information
- Father's Name (required), Occupation, Contact, Annual Income
- Mother's Name (required), Occupation, Contact
- Guardian section (if different)
- Dynamic siblings rows with Add/Remove buttons

### Step 4: Academic Information
- Previous School, Class/Grade, Roll Number/Student ID, Academic Year, Section
- Previous Qualification, Percentage/Grade, Board/University
- Batch selector (existing), enrollment date, billing/course months, fees
- Status selector

### Step 5: Review and Submit
- Read-only summary of all entered data grouped by section
- Edit buttons per section to jump back
- Notes/Remarks textarea
- Initial payment section (existing)
- Submit button with loading state

### Technical Details
- New component: `StudentWizardDialog.tsx` (replaces `StudentDialog` in new-student flow)
- Auto-save draft to localStorage keyed by `student-draft-{companyId}`
- Progress indicator showing current step (1 of 5)
- Form validation per step using zod
- Edit mode remains a single scrollable form (sections with accordions)
- Update `useStudents` hook interfaces (`StudentInsert`, `Student`) with new fields

---

## Phase 3: CSV/Excel Bulk Import

### 3A. Edge Function: `bulk-import-students`
- Accepts CSV text + column mapping + company_id + batch_id (optional)
- Validates rows: required fields, date formats, duplicates (by student_id_number)
- Inserts valid rows in batches of 100
- Returns: success count, failed rows with reasons, duplicate count

### 3B. Frontend: `BulkImportDialog.tsx`
- File upload accepting .csv, .xlsx, .xls
- "Download Template" button generating a sample CSV with all field headers
- After upload: parse file client-side (using built-in FileReader for CSV; for XLSX, use a lightweight parser)
- Preview table showing first 10 rows
- Auto-detect column mapping (case-insensitive fuzzy match on header names)
- Manual mapping UI: source columns on left, target fields dropdown on right
- Validation summary: X valid, Y errors, Z duplicates
- Option to proceed with valid rows only
- Progress bar during import
- Post-import report with download error log option
- Optional batch assignment during import
- Audit log entry for bulk imports

### 3C. Integration
- "Import Students" button on Students page header (permission-gated: admin + moderators with add student permission)

---

## Phase 4: Advanced Search, Filtering, Batch Assignment, and Global Search

### 4A. Enhanced Student Filters
- Extend `StudentFilters.tsx` with new filter criteria:
  - Batch dropdown (all batches), Class/Grade, Gender, Blood Group, Academic Year
  - Date of Birth range (from-to)
  - City, State, Transportation Mode
  - Assigned to Batch (Yes/No/Specific)
  - Father's Occupation, Income Range
- Collapsible advanced filter panel
- Active filters shown as removable chips
- Filter presets saved to localStorage

### 4B. Enhanced Student Table
- Column customization (show/hide columns via popover checklist)
- Bulk selection with checkboxes
- Bulk actions: Assign to Batch, Export Selected, Delete Selected
- Server-side pagination with configurable page sizes (25, 50, 100, 200)
- Sort by any column header

### 4C. Batch Assignment
- From Students page: select students -> "Assign to Batch" -> modal with batch search + capacity check
- From Batch Detail page: "Add Students" button -> search modal with:
  - Multi-field search (name, ID, father name, contact, email)
  - Exclude already-enrolled students
  - Capacity indicator
  - Select + assign flow

### 4D. Global Command Palette (Cmd+K)
- New component: `CommandPalette.tsx` using existing `cmdk` dependency
- Searches across: Students (name, ID), Batches (name, code), Courses (name, code)
- Results grouped by type with icons
- Click navigates to detail page
- Keyboard shortcut Cmd/Ctrl+K registered in `AppLayout`

### 4E. Export Enhancements
- Export button with CSV/PDF options
- Column selection for export
- Export respects current filters
- File includes metadata (filters, timestamp, generated by)

---

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/StudentWizardDialog.tsx` | 5-step student creation wizard |
| `src/components/StudentWizardSteps/PersonalStep.tsx` | Step 1 |
| `src/components/StudentWizardSteps/ContactStep.tsx` | Step 2 |
| `src/components/StudentWizardSteps/FamilyStep.tsx` | Step 3 (includes siblings) |
| `src/components/StudentWizardSteps/AcademicStep.tsx` | Step 4 |
| `src/components/StudentWizardSteps/ReviewStep.tsx` | Step 5 |
| `src/components/BulkImportDialog.tsx` | CSV import modal |
| `src/components/BulkAssignBatchDialog.tsx` | Batch assignment modal |
| `src/components/AddStudentToBatchDialog.tsx` | Search + add from batch detail |
| `src/components/CommandPalette.tsx` | Global Cmd+K search |
| `src/components/ColumnCustomizer.tsx` | Column show/hide popover |
| `src/hooks/useStudentSiblings.ts` | CRUD for siblings table |
| `src/utils/csvImportUtils.ts` | CSV parsing, field mapping, validation |
| `supabase/functions/bulk-import-students/index.ts` | Server-side bulk import |

## Files to Modify
| File | Changes |
|------|---------|
| `src/hooks/useStudents.ts` | Extended interfaces, new filter params, server-side pagination |
| `src/pages/Students.tsx` | Bulk selection, new filters, column customizer, import button |
| `src/pages/StudentDetail.tsx` | Display all new profile fields in sections |
| `src/pages/BatchDetail.tsx` | Add "Add Students" button + dialog integration |
| `src/components/StudentFilters.tsx` | Extended filter controls, chips, presets |
| `src/components/StudentDialog.tsx` | Keep for edit mode (accordion sections with new fields) |
| `src/components/AppLayout.tsx` | Register Cmd+K shortcut, render CommandPalette |
| `src/components/ExportButtons.tsx` | Column selection, filter metadata |

## Security Considerations
- All new columns inherit existing RLS policies on `students` table (no changes needed)
- `student_siblings` table gets matching RLS policies
- Bulk import edge function validates auth token + company membership
- CSV import rate-limited to prevent abuse
- No sensitive data exposed without proper company membership

## Performance Optimizations
- Database indexes on frequently searched/filtered columns
- Server-side pagination (offset-based with configurable page size)
- Debounced search (300ms)
- React.memo on table rows and filter components
- Query key includes all filter params to leverage TanStack Query caching
- Bulk operations use batched inserts (100 per batch)
