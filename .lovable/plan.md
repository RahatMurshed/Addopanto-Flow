

# Slim & Theme-Matched Sidebar Scrollbar

## What Changes

Add custom CSS to make the sidebar scrollbar thinner and blend with the sidebar's dark background, so it doesn't visually distract.

## Technical Details

### File: `src/index.css`

Add custom scrollbar styles targeting the sidebar nav elements:

- **Width**: Reduce from browser default (~8-12px) to 4px
- **Colors**: Use the sidebar background tones so the scrollbar blends in, with a slightly lighter thumb on hover
- **Both engines**: Use `::-webkit-scrollbar` for Chrome/Safari/Edge and `scrollbar-width: thin` + `scrollbar-color` for Firefox

The CSS will target `.sidebar-nav-scroll` class (a new utility class added to the two `overflow-y-auto` nav containers).

### File: `src/components/layout/AppLayout.tsx`

Add the `sidebar-nav-scroll` class to:
- Desktop nav (line 228): `className="flex-1 space-y-1 p-3 overflow-y-auto sidebar-nav-scroll"`
- Mobile nav (line 307): `className="flex-1 space-y-1 overflow-y-auto sidebar-nav-scroll"`

### CSS Rules (added to `src/index.css`)

```css
/* Thin, theme-matched sidebar scrollbar */
.sidebar-nav-scroll {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--sidebar-accent)) transparent;
}
.sidebar-nav-scroll::-webkit-scrollbar {
  width: 4px;
}
.sidebar-nav-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-nav-scroll::-webkit-scrollbar-thumb {
  background: hsl(var(--sidebar-accent));
  border-radius: 4px;
}
.sidebar-nav-scroll::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--sidebar-border));
}
```

This keeps the scrollbar functional but nearly invisible, matching the sidebar's dark blue theme.
