

## Fix: Remove duplicate marker popup

**Problem**: Tapping a map marker shows both a Leaflet popup (the built-in bubble) and the custom quick card at the bottom — two overlapping UI elements for the same action.

**Solution**: Remove the `bindPopup` call from markers in `FullscreenMap.tsx`, keeping only the custom quick card as the single response to tapping a marker.

### Changes

**File: `src/components/explore/FullscreenMap.tsx`**
- Remove the `bindPopup(...)` call (lines 128-146) from the marker creation loop
- Keep the `marker.on("click", () => setSelectedMarker(m))` so the quick card still appears
- Also remove the `map.on("popupopen", ...)` handler (lines ~89-99) since popups will no longer exist
- Update `handleNearbyClick` to no longer call `leafletMarker.openPopup()` — instead just center the map and set the selected marker

