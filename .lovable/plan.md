## What's broken

In your screenshot, the **"Allow location access"** rationale dialog is rendering incorrectly on iOS:

- The orange MapPin icon is clipped at the very top edge of the card.
- The title, description, and bullet points are missing/cut off.
- Only the **"Not now"** button is visible — the primary **"Allow location"** button is also clipped.
- The Explore map underneath is visible through the dialog area, making it look like "the map is on top".

This dialog auto-fires when the Explore page mounts (and again from `LocationSearch` inside the Add Story flow), which is why you see it both on Explore and during story creation.

## Root cause

`src/index.css` has a global mobile tap-target rule (lines 29–58) that does this to **every** `button` on touch devices:

```css
button { position: relative; }
button::after {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px; min-height: 44px;
  width: 100%; height: 100%;
}
```

This is fine for normal buttons, but inside Radix `DialogContent` (which uses `display: grid`), the auto-injected close button + the two stacked footer buttons each get a 44×44 invisible overlay child. Combined with `DialogContent`'s `translate(-50%, -50%)` centering and `grid` row sizing, the grid tracks get pushed beyond the viewport on a 393×697 iOS screen with the notch/safe area, clipping the title and primary button. The body region renders as transparent space, exposing the Explore map below.

Secondary issue: `ExplorePage` calls `requestLocation()` immediately on mount, which fires the rationale prompt every time the user lands on Explore. Apple's review guideline is to request only after a clear user action.

## Plan

### 1. Harden the global tap-target rule so it skips dialog content

In `src/index.css`, exclude buttons inside Radix dialogs (and other overlays) from the `::after` pseudo-element. We keep the 44pt safety net for primary UI buttons, but stop the layout breakage in modal grids.

```css
@media (hover: none) and (pointer: coarse) {
  /* …existing rule… */

  /* Don't inflate buttons inside Radix overlays — their internal layout
     (grid/flex with fixed gap) cannot absorb a stretched ::after child. */
  [role="dialog"] button::after,
  [role="alertdialog"] button::after,
  [data-radix-popper-content-wrapper] button::after,
  .leaflet-container button::after {
    content: none !important;
    display: none !important;
  }
}
```

### 2. Make `PermissionPrompt` resilient to short viewports

In `src/components/permissions/PermissionPrompt.tsx`:

- Add `max-h-[85vh] overflow-y-auto` to `DialogContent` so the rationale scrolls instead of clipping on small phones.
- Wrap the icon + header + bullets + footer in a single column with explicit `gap-3` (replacing the implicit grid gap so the layout is predictable on iOS Safari).
- Ensure `DialogFooter` keeps `flex-col gap-2` on mobile and that both buttons render (the primary `Allow` was being pushed off-screen).

### 3. Stop auto-firing the rationale on `ExplorePage`

In `src/pages/ExplorePage.tsx`, remove the unconditional `requestLocation()` on mount. Instead:

- On mount, only call `startWatching()` (which itself checks `permissions.query` first and returns silently if not yet granted — no prompt).
- Trigger `requestLocation()` only when the user taps the **"Center on me / Locate"** button or opens the fullscreen map. This matches the existing pattern in `FullscreenMap` (`onRequestLocation`) and is App Store compliant (request on user action, not on page load).

### 4. Verify the same dialog in the Add Story flow

`CreateStoryModal` → Location tool uses `LocationSearch`, which doesn't directly call the permission prompt, but Nominatim search works without GPS. No change needed there — once the global CSS fix lands, any future location prompt fired from inside the story modal will also render correctly.

## Files to change

- `src/index.css` — exclude dialog/overlay buttons from the tap-target `::after`.
- `src/components/permissions/PermissionPrompt.tsx` — `max-h-[85vh] overflow-y-auto`, explicit gap, footer fix.
- `src/pages/ExplorePage.tsx` — drop the auto `requestLocation()`; keep `startWatching()` (silent if not yet granted) and let user-tap actions trigger the rationale.

## Validation

After the changes:

- On Explore, the permission rationale should no longer pop up automatically.
- When triggered (by tapping locate / opening fullscreen map / Find My Pet), the dialog shows the orange icon, the "Allow location access" title, the 3 bullets, and **both** "Allow location" + "Not now" buttons fully visible on a 393×697 viewport.
- The underlying map no longer bleeds through the dialog body.
- Other dialogs across the app (Share Story, Forward, Boost, etc.) keep their normal layout — the tap-target rule still protects standalone buttons, just not those inside modal grids.
