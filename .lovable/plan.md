

## Fix: Make View Button Available to All Users

### Problem
The View button in the Students table is currently hidden from Data Entry Operator users due to a guard condition (`!isDataEntryOperator`). The `StudentProfileDialog` already displays all student details (Personal, Contact, Address, Family, Academic, Additional info) -- it just needs to be accessible to everyone.

### Change

**File: `src/pages/Students.tsx` (line 504)**

Remove the `!isDataEntryOperator` condition wrapping the View button so all users (including Data Entry Operators) can click View to see the full student profile.

Before:
```
{!isDataEntryOperator && (
  <Button variant="ghost" size="sm" ...>
    <Eye /> View
  </Button>
)}
```

After:
```
<Button variant="ghost" size="sm" ...>
  <Eye /> View
</Button>
```

This is a single-line change. The `StudentProfileDialog` already shows all details entered during student creation -- no modifications needed there.

