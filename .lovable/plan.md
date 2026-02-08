
# Plan: Fix PDF Export Issues (Shrinking & Theme Adaptation)

## Problems Identified

### Issue 1: Shrunk & Unreadable PDF Content
The current implementation captures the page with `html2canvas` at scale 2, but the multi-page handling logic has a bug where it adds the **entire** image to each page instead of properly slicing it, causing content to appear compressed and overlapping.

### Issue 2: Dark Mode = Dark PDF
The `html2canvas` configuration uses `backgroundColor: "#ffffff"` (white), but this only sets the canvas background - it doesn't override the dark mode CSS styles applied to text and elements. In dark mode, you get white background with dark-themed elements (light text, dark cards), making it unreadable.

---

## Solution

### Fix 1: Proper Multi-Page PDF Rendering
Replace the current buggy page-splitting logic with proper A4-sized PDF generation:
- Use fixed A4 dimensions (210mm x 297mm)
- Calculate proper aspect ratio for content
- Handle multi-page content by slicing the canvas image correctly

### Fix 2: Force Light Theme for PDF Export
Before capturing with `html2canvas`:
1. Temporarily remove the `dark` class from `document.documentElement`
2. Capture the content (now rendered in light mode)
3. Restore the original theme after capture

This ensures PDFs are always clean, readable, and professionally formatted regardless of the user's current theme.

---

## Technical Implementation

### File to Modify: `src/utils/exportUtils.ts`

**Changes:**

1. **Detect current theme** before capture
2. **Temporarily force light mode** by removing `dark` class
3. **Increase scale to 3** for better quality (currently 2)
4. **Fix multi-page logic** using proper A4 dimensions and image slicing
5. **Restore original theme** after capture completes

```text
Before capture:
+---------------------------+
| 1. Store current theme    |
| 2. Remove 'dark' class    |
| 3. Wait for reflow        |
+---------------------------+
           |
           v
+---------------------------+
| html2canvas at scale: 3   |
| backgroundColor: #ffffff  |
+---------------------------+
           |
           v
+---------------------------+
| Generate PDF with:        |
| - A4 page size            |
| - Proper image slicing    |
| - Multi-page handling     |
+---------------------------+
           |
           v
+---------------------------+
| Restore original theme    |
+---------------------------+
```

---

## Expected Results

| Before | After |
|--------|-------|
| Shrunk, overlapping content | Full-size, readable content |
| Dark mode = unreadable PDF | Always light, professional PDF |
| Low resolution (scale 2) | Higher resolution (scale 3) |

---

## Files Changed

| File | Change |
|------|--------|
| `src/utils/exportUtils.ts` | Fix PDF generation with theme handling and proper pagination |

No other files need modification - all pages (Dashboard, Revenue, Expenses, Reports) use the same `exportToPDF` function.
