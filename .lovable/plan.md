

# Fix Edit Student Button Visibility in Dark Mode

## Problem
The "Edit Student" button in `ProfileHeader.tsx` uses `border-secondary text-secondary` classes. In dark mode, `secondary` resolves to a dark color that blends into the dark card background, making the button invisible.

## Solution
Update the button classes on line 124 to use explicit brand colors with dark mode overrides:

**File: `src/components/students/profile/ProfileHeader.tsx` (line 124)**

Change:
```
border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground
```

To:
```
border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-white
```

This ensures the button text and border are visible in both light mode (dark blue on white) and dark mode (light blue on dark background), with a filled hover state in both themes.

