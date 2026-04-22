/**
 * "Skip to main content" link — first focusable element in the DOM.
 *
 * Why: keyboard and screen-reader users should not have to tab through the
 * entire bottom nav and header to reach the page's main content on every
 * route. WCAG 2.4.1 (Bypass Blocks) requires this for AA conformance, and
 * Apple/Google accessibility reviewers look for it.
 *
 * The link is visually hidden until focused, then snaps into view in the
 * top-left so sighted keyboard users can see and activate it.
 *
 * Pair with `id="main-content" tabIndex={-1}` on the primary <main> element
 * inside each page (NativeShell wraps routes — see App.tsx).
 */
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only-focusable fixed left-2 top-2 z-[100] rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
}
