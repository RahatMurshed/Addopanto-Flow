

# Create Quick-Start Plan Template

## Overview
Add a reusable Markdown template file (`.lovable/PLAN_TEMPLATE.md`) that standardizes how new implementation plans are written. This template captures the conventions already established by existing plans in the project and provides fill-in sections so future plans can be created faster and more consistently.

## What the Template Includes

The template will have the following sections, each with placeholder guidance:

1. **Title** -- Short feature/fix name
2. **Problem / Motivation** -- What is broken or missing, and why it matters
3. **Current State** -- Relevant existing code, tables, or components (with file paths)
4. **Solution** -- High-level approach in 2-3 sentences
5. **Changes** -- Per-file breakdown (numbered, with bullet points for each modification)
6. **Technical Details** -- Implementation notes: patterns used, edge cases, security considerations (RLS, PII), currency handling
7. **Testing Checklist** -- Table format (matching the DEO testing plan style) with columns: #, Test, Expected Result, Pass
8. **Files Modified** -- Summary list of all touched files
9. **Rollback Notes** -- What to revert if something goes wrong

## File Created
- `.lovable/PLAN_TEMPLATE.md`

## Technical Details

The template is a plain Markdown file with no code changes. It follows the exact formatting conventions seen in the two existing plans:
- `plan.md` uses heading hierarchy: Problem, Changes (per-file with numbered headings), Technical Details, Files Modified
- `deo-testing-plan.md` uses phased testing tables with checkbox columns

The template merges both styles into a single reusable scaffold. Placeholder text is wrapped in `[brackets]` for easy find-and-replace.

