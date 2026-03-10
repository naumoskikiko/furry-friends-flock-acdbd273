

## Issues Identified

1. **Race condition on map init**: The fullscreen map creates the Leaflet instance with a 50ms delay, but the marker-update effect fires immediately when `open` becomes true. At that point `markersLayerRef.current` is still `null`, so no markers are added. If the markers/filteredMarkers array doesn't change after those 50ms, the effect never re-runs.

2. **Markers re-created on selection**: The marker-update effect depends on `selectedMarker`, causing all markers to be cleared and re-added every time the user taps one. This destroys the open popup and causes visual flicker.

3. **Bottom panel too small in collapsed state**: `max-h-[140px]` with header + drag handle leaves only ~80px for content, barely showing one item. Scrolling doesn't work well because `overflow-hidden` is on the parent.

4. **Bottom panel items only focus the map, don't navigate**: Clicking a nearby item in the bottom panel centers the map and opens a popup, but the user also expects to navigate to place details. The UX is inconsistent with the main Explore page.

## Plan

### 1. Fix race condition -- markers not appearing

- After creating the map in the init effect, immediately add the markers inside the same `setTimeout` callback instead of relying on a separate effect.
- Add a `mapReady` state flag. Set it to `true` after the map is created. Make the markers effect depend on `mapReady` so it re-runs once the map is actually initialized.

### 2. Stop re-creating markers on selection

- Remove `selectedMarker` from the markers effect dependency array.
- Instead, use a separate effect that only updates the icon of the previously selected and newly selected marker (swap between active/inactive icon) without clearing the entire layer.

### 3. Fix bottom panel layout and interaction

- Increase collapsed `max-h` from `140px` to `180px` and inner scroll area from `80px` to `120px` so 2-3 items are visible.
- Move `overflow-hidden` to only the scroll container, not the outer panel, so the drag handle and header remain interactive.
- Add a "View Details" action: tapping a nearby item centers the map and shows the quick card; add a small arrow/chevron to indicate it's tappable.

### 4. Ensure popup links work correctly

- The popup "View Details" `<a>` tag uses raw `href="/place/..."` which causes a full page reload in a SPA. Intercept popup link clicks using Leaflet's `popupopen` event and use `navigate()` instead.

### Files to modify

- `src/components/explore/FullscreenMap.tsx` -- all fixes above

