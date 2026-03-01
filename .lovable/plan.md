

# Fix Student Fees Badge Visibility

## Problem
The "Student Fees" named override uses custom saturation/lightness values (85%/45% in light mode) that differ from the standard badge formula (70%/35%). This makes violet text less readable in light mode compared to other badges.

## Solution
Use the exact same HSL formula that all other dynamically-generated badges use, but locked to hue 270 (violet):

| Mode | Property | Current (broken) | Fixed (matches others) |
|------|----------|-------------------|----------------------|
| Light | text | hsl(270, 85%, 45%) | hsl(270, 70%, 35%) |
| Light | border | hsla(270, 80%, 50%, 0.50) | hsla(270, 65%, 45%, 0.45) |
| Dark | text | hsl(270, 90%, 72%) | hsl(270, 90%, 65%) |
| Dark | border | hsla(270, 90%, 65%, 0.55) | hsla(270, 90%, 60%, 0.50) |

## File changed
- `src/utils/sourceColors.ts` — update the `Student Fees` entry in `NAMED_OVERRIDES` to match the standard dynamic formula at hue 270.

This ensures the violet badge has identical contrast and weight to every other source badge.
