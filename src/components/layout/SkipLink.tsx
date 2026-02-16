/**
 * Skip-to-content link for keyboard users.
 * Visually hidden until focused via Tab, then appears at the top of the viewport.
 */
export function SkipLink({ targetId = "main-content", label = "Skip to main content" }: {
  targetId?: string;
  label?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {label}
    </a>
  );
}
