

# Regenerate "Addopanto Flow" Logo (Transparent Background, Larger)

## What I'll Do

Use AI image generation to create a new version of the "Addopanto Flow" logo with:
- **Transparent background** (true PNG with alpha channel)
- **Larger canvas size** (e.g. 1024x512 or similar) so it renders crisply at all sizes
- Same theme colors: deep orange and dark navy blue
- Clean, professional SaaS style
- Text: "Addopanto Flow" (no "Demo")

## Steps

1. **Generate the logo** using Nano banana pro (google/gemini-3-pro-image-preview) with explicit instructions for transparent/white background and high resolution
2. **Save to both asset locations**:
   - `src/assets/GA-LOGO.png`
   - `public/GA-LOGO.png`
3. **No code changes needed** -- all 8 files already reference these paths with `object-contain` and `w-auto` styling, so a larger image will display correctly everywhere

## Technical Notes

- AI image generation models may not produce true transparency reliably; if the result has a white background, I will instruct the prompt to use a clean white background that blends well with both light and dark themes
- The logo appears in the sidebar (h-10), mobile header (h-8), auth pages (h-12 to h-16), landing page nav (h-9), and footer (h-7) -- all use `w-auto object-contain` so a larger source image will simply render sharper
- Files affected: `src/assets/GA-LOGO.png`, `public/GA-LOGO.png`

