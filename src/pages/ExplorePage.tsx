import { Suspense, lazy } from "react";
import AppLayout from "@/components/AppLayout";
import { Search, SlidersHorizontal, MapPin, Locate } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import NearbySection from "@/components/explore/NearbySection";
import { useExplore, FILTERS } from "@/hooks/useExplore";
import { Skeleton } from "@/components/ui/skeleton";

const ExploreMap = lazy(() => import("@/components/explore/ExploreMap"));

const ExplorePage = () => {
  const {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    findMyPet,
    setFindMyPet,
    center,
    allMarkers,
    searchResults,
    nearbyByCategory,
    loading,
  } = useExplore();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Search */}
        <div className="sticky top-0 z-40 bg-card/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places, sitters, stores..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-body"
              />
            </div>
            <button className="rounded-xl bg-secondary p-2.5">
              <SlidersHorizontal className="h-4 w-4 text-foreground" />
            </button>
          </div>

          {/* Filter chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeFilter === f
                    ? "petkeep-gradient text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Search results dropdown */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="mx-4 rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
            {searchResults.map((r: any) => (
              <button
                key={r.id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
              >
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-base">
                    {r.emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.type}</p>
                </div>
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Find My Pet toggle */}
        <div className="mx-4 mt-3 flex items-center justify-between rounded-2xl bg-card p-3 petkeep-card-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-petkeep-mint/15">
              <Locate className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold font-display">Find My Pet</p>
              <p className="text-[11px] text-muted-foreground">GPS tracking & lost pets</p>
            </div>
          </div>
          <Switch checked={findMyPet} onCheckedChange={setFindMyPet} />
        </div>

        {/* Map */}
        <div className="mx-4 mt-3">
          {loading ? (
            <Skeleton className="h-[45vh] w-full rounded-2xl" />
          ) : (
            <Suspense fallback={<Skeleton className="h-[45vh] w-full rounded-2xl" />}>
              <ExploreMap markers={allMarkers} center={center} />
            </Suspense>
          )}
          {findMyPet && (
            <div className="mt-2 rounded-xl bg-accent/10 border border-accent/20 p-3 text-center">
              <p className="text-xs font-semibold text-accent">🐾 Find My Pet mode active</p>
              <p className="text-[11px] text-muted-foreground mt-1">Lost pet reports & GPS devices will appear on the map</p>
            </div>
          )}
        </div>

        {/* Nearby sections */}
        <div className="mt-2 pb-4">
          <NearbySection title="Nearby Pet Shops" items={nearbyByCategory.stores} />
          <NearbySection title="Nearby Veterinarians" items={nearbyByCategory.vets} />
          <NearbySection title="Nearby Parks" items={nearbyByCategory.parks} />
          <NearbySection title="Nearby Grooming Salons" items={nearbyByCategory.grooming} />
        </div>
      </div>
    </AppLayout>
  );
};

export default ExplorePage;
