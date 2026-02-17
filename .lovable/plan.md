

## Audit and Fix: Complete Data Backup System

### Problems Found

**1. Export is missing 6 tables entirely**
The old `exportCompanyData()` utility only exports 10 tables. The newer `useDataManagement` export handles 16 tables plus company settings, but the utility function is out of sync.

Tables missing from the utility (but present in the hook's export):
- `courses`
- `student_siblings`
- `student_batch_history`
- `company_memberships`
- `audit_logs`
- `currency_change_logs`
- `company_settings` (the company record itself)

**2. Student restore is missing ~27 fields**
When restoring students, only about half of the columns are mapped. These fields are silently lost:

- Personal: `blood_group`, `religion_category`, `nationality`, `aadhar_id_number`
- Family: `father_occupation`, `father_annual_income`, `mother_occupation`, `guardian_relationship`
- Academic: `previous_school`, `previous_qualification`, `previous_percentage`, `board_university`
- Contact/Emergency: `emergency_contact_name`, `emergency_contact_number`, `special_needs_medical`
- Address (permanent): `permanent_address_same`, `perm_address_house`, `perm_address_street`, `perm_address_area`, `perm_address_city`, `perm_address_state`, `perm_address_pin_zip`
- Other: `transportation_mode`, `distance_from_institution`, `extracurricular_interests`, `language_proficiency`

**3. Restore skips `student_batch_history` and `currency_change_logs`**
These are exported but never restored.

**4. Company settings not restored**
The backup includes the company record (currency, fiscal year, etc.) but restore ignores it.

**5. Timestamps not preserved**
`created_at` values for all records are lost -- they all get `now()` instead of the original dates. This makes audit trails and historical analysis inaccurate after restore.

---

### Solution

#### File 1: `src/utils/dataBackupUtils.ts`
- Update `exportCompanyData()` to export all 16 tables plus company settings (matching what `useDataManagement` already does)
- Add `currency_change_logs` count to `BackupPreview`
- Update `getBackupPreview()` to include the new count
- Bump backup version to `"3.0"` in validation

#### File 2: `src/hooks/useDataManagement.ts`
- **Student restore**: Add all 27 missing fields to the insert payload
- **Student batch history restore**: Add a new restore step for `student_batch_history` records, mapping `student_id`, `from_batch_id`, and `to_batch_id` using existing ID maps
- **Currency change logs restore**: Add a restore step for `currency_change_logs`
- **Company settings restore**: If backup contains `company_settings`, update the active company's currency, fiscal year, and exchange rate
- **Preserve timestamps**: Include `created_at` in all insert payloads so historical dates survive the restore

#### File 3: `src/components/dialogs/RestoreDataDialog.tsx`
- Add `currency_change_logs` count to the preview display so users can see all data being restored

---

### Technical Details

**Student restore insert -- adding missing fields:**
```text
blood_group, religion_category, nationality, aadhar_id_number,
father_occupation, father_annual_income, mother_occupation,
guardian_relationship, previous_school, previous_qualification,
previous_percentage, board_university, special_needs_medical,
emergency_contact_name, emergency_contact_number,
transportation_mode, distance_from_institution,
extracurricular_interests, language_proficiency,
permanent_address_same, perm_address_house, perm_address_street,
perm_address_area, perm_address_city, perm_address_state,
perm_address_pin_zip
```

**Timestamp preservation pattern:**
Each insert will include `created_at: record.created_at` to keep the original timestamp.

**Student batch history restore** needs INSERT RLS policy (currently missing). A database migration will be added to create this policy.

**No breaking changes** -- all additions are backward-compatible with older backup files since each new field defaults to `undefined`/`null`.

