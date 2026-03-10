

## Plan: Remove Filter Button from Explore Page

### Changes in `src/pages/ExplorePage.tsx`

1. **Remove the filter button** (lines 75-77) next to the search bar
2. **Remove the filter modal state and component** (`filterOpen`, `filters`, `setFilters` state variables and the `<SearchFilterModal>` render)
3. **Remove unused imports**: `SlidersHorizontal`, `SearchFilterModal`, `SearchFilters`
4. **Keep the filter chips** (All, Sitters, Walkers, etc.) as they serve as inline category filters

The search bar will span full width without the adjacent filter icon button.

