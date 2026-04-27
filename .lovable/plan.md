## The problem

In your screenshots, the blue dot (your real GPS position) is in the south-east of the map, but every place marker is clustered up north around Skopje city center. The "Nearby Places" panel still claims "Espresso · 0.5 km" — yet on the map, that café is clearly several kilometers away from the blue dot.

That "0.5 km" is wrong. It's measured from the **default Skopje city center**, not from where you actually are.

## Root cause

The Explore page and the Fullscreen Map use **two different mechanisms** to find your location:

1. **`useExplore`** (powers markers + distances) calls the raw browser geolocation API directly. On iOS / Capacitor, when permission hasn't been pre-granted, this call fails silently — no permission rationale is shown, no retry — and `center` stays stuck on the hard-coded fallback `[41.9981, 21.4254]` (Skopje city center).
2. **`useUserLocation`** (powers the blue dot inside the fullscreen map) goes through the proper permission prompt flow. It successfully gets your real GPS, so the blue dot appears in the right spot.

Result: the blue dot is correct, but every marker position is computed/sorted relative to default Skopje, and every "X km" label is the distance from default Skopje to that place — completely disconnected from where you're standing.

A second smaller issue: even when location does eventually update, marker distance strings only recompute when `dbPlaces` or `center` changes — and once the fullscreen map is open, `center` updates immediately re-pan the map view (`map.setView(center, ...)`), which can yank the camera away while you're interacting.

## The fix

### 1. Use the same location source everywhere
Replace the raw `navigator.geolocation.getCurrentPosition` call in `src/hooks/useExplore.ts` with the existing `useUserLocation` hook. This guarantees:
- Same permission prompt flow (works on iOS/Capacitor)
- Same coordinates used for distance calculation, marker sort order, and the blue dot
- Continuous updates via `startWatching` so distances stay accurate as you move

`center` becomes: `userLocation ? [userLocation.lat, userLocation.lng] : SKOPJE_FALLBACK`.

### 2. Stop yanking the fullscreen map view on every location update
In `src/components/explore/FullscreenMap.tsx`, the effect on lines 110-114 calls `map.setView(center, ...)` whenever `center` changes. With continuous watching, `center` will update every few seconds, fighting the user's pan/zoom. Change this so the map only re-centers on `center` **once at open time**, not on every change. Following-mode camera updates already happen separately via the `userLocation` effect.

### 3. Show a clear "no location" state instead of silently lying
If location permission is denied or unavailable, distances computed from default Skopje are misleading. Update `useExplore` to:
- Omit the `distance` field on markers/nearby items when we don't have a real user location yet
- Sort by name (or leave unsorted) instead of by fake distance

The `NearbySection` / `FullscreenMap` panel will then just hide the "X km" chip when distance is empty (the existing JSX already conditionals on `m.distance`).

### 4. Verify on a quick scan
After the change:
- Open Explore → blue dot and the markers should both be in the same neighborhood
- The closest item in "Nearby Places" should actually be the closest one to the blue dot
- Tapping recenter ("Following your location") and then panning shouldn't get hijacked back

## Files to change

- `src/hooks/useExplore.ts` — swap raw geolocation for `useUserLocation`; gate `distance` on real fix; sort markers by real distance only when available
- `src/components/explore/FullscreenMap.tsx` — make the `center → setView` effect run only on map init, not on every `center` change

## Out of scope

- No DB changes — the place coordinates in the database are correct; the bug is purely in how the client computes "where I am."
- No changes to map tiles, marker icons, or the bottom panel layout.
