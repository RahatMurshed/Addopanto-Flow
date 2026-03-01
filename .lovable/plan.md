

# Minor Fixes — Phone Input Formatting

All other items from the list are already implemented:
- Mobile menu aria-label: done (AppLayout.tsx line 291)
- Global unhandledrejection listener: done (main.tsx lines 6-8)
- NotFound console.warn: done (NotFound.tsx line 9)
- iOS Safari sticky: handled by autoprefixer in postcss.config.js

The only remaining fix is **phone input formatting**.

---

## Plan: BD Phone Input Mask (01XXX-XXXXXX)

### 1. Create `src/utils/phoneFormat.ts`

A small utility with two functions:
- `formatBDPhone(raw)` — strips non-digits, caps at 11 chars, inserts dash after position 5 (e.g. `01712-345678`). If input starts with `+`, leaves it untouched for international numbers.
- `stripPhoneFormat(formatted)` — removes dash to get raw digits for database storage.

### 2. Apply to phone inputs across the app

Update the `onChange` handler for phone/WhatsApp/alt-contact inputs in these files:

| File | Fields |
|------|--------|
| `src/components/StudentWizardSteps/ContactStep.tsx` | phone, whatsapp_number, alt_contact_number |
| `src/components/dialogs/StudentDialog.tsx` | phone field |
| `src/components/dialogs/EmployeeDialog.tsx` | contact_number, whatsapp_number |
| `src/pages/ProfilePage.tsx` | phone, alt_phone |
| `src/pages/CreateCompany.tsx` | contact_phone |

Pattern for each input:
```text
import { formatBDPhone, stripPhoneFormat } from "@/utils/phoneFormat";

// Display formatted value
value={formatBDPhone(data.phone)}

// Store raw digits
onChange={(e) => update({ phone: stripPhoneFormat(e.target.value) })}
```

The display shows `01XXX-XXXXXX` formatting while the stored value remains raw digits — no data migration needed.

### 3. Add `type="tel"` and `inputMode="numeric"`

Add `type="tel"` and `inputMode="numeric"` to all phone inputs for better mobile keyboard experience.

