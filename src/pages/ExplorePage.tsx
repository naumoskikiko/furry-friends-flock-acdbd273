import { Suspense, lazy, useState, useEffect, useRef, useCallback } from "react";
import { useTabRefresh } from "@/hooks/useTabRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Search, MapPin, Locate, Maximize2, ChevronRight } from "lucide-react";
import NearbySection from "@/components/explore/NearbySection";
import FullscreenMap from "@/components/explore/FullscreenMap";
import { useExplore, FILTERS } from "@/hooks/useExplore";
import { useUserLocation } from "@/hooks/useUserLocation";
import { Skeleton } from "@/components/ui/skeleton";

const ExploreMap = lazy(() => import("@/components/explore/ExploreMap"));

const ExplorePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Single source of truth for the user's GPS across this page, the
  // useExplore hook (distance/sort calculations) and the FullscreenMap
  // (blue dot + follow mode). Multiple parallel useUserLocation instances
  // were racing on iOS/Capacitor and breaking the blue dot entirely.
  const { location: userLocation, requestLocation, startWatching, stopWatching, PermissionDialog: ExplorePermissionDialog } = useUserLocation();
  // App Store compliance: do NOT cold-prompt for location on page mount.
  // startWatching() is silent if permission isn't granted yet — it only
  // attaches a watcher when the OS already has permission. The rationale
  // dialog only fires when the user taps Locate / opens fullscreen map.
  useEffect(() => {
    startWatching();
    return () => stopWatching();
  }, [startWatching, stopWatching]);

  const {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    center,
    allMarkers,
    searchResults,
    nearbyByCategory,
    allNearbyItems,
    loading,
  } = useExplore(userLocation);

  useEffect(() => {
    if (searchParams.get("focus") === "search") {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [searchParams]);

  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const refreshExplore = useCallback(async () => {
    setSearchQuery("");
    setActiveFilter("All");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchQuery, setActiveFilter]);

  useTabRefresh("/explore", refreshExplore);

  const { refreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: refreshExplore });

  const handleResultClick = (r: any) => {
    if (r.type === "User") {
      navigate(`/user/${r.username || r.id}`);
    } else {
      navigate(`/place/${r.id}`);
    }
  };

  const handleSeeMore = (tab: "users" | "places" | "posts") => {
    navigate(`/search?q=${encodeURIComponent(searchQuery)}&tab=${tab}`);
  };

  const handleNearbyClick = (item: any) => {
    navigate(`/place/${item.id}`);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Search — stays outside pull-to-refresh */}
        <div className="sticky top-0 z-40 bg-card/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  handleSeeMore("users");
                }
              }}
              placeholder="Search places, users, @username..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-body"
            />
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

        {/* Pull-to-refresh content area */}
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <PullToRefreshIndicator refreshing={refreshing} pullDistance={pullDistance} />

        {/* Search results dropdown */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="mx-4 rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
            {searchResults.map((r: any) => (
              <button
                key={r.id}
                onClick={() => handleResultClick(r)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
              >
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-base">
                    {r.emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.username ? `@${r.username}` : r.type}
                  </p>
                </div>
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {/* See More buttons */}
            <div className="flex border-t border-border divide-x divide-border">
              <button
                onClick={() => handleSeeMore("users")}
                className="flex-1 py-2.5 text-xs font-semibold text-primary hover:bg-secondary/30 transition-colors"
              >
                See More Users
              </button>
              <button
                onClick={() => handleSeeMore("places")}
                className="flex-1 py-2.5 text-xs font-semibold text-primary hover:bg-secondary/30 transition-colors"
              >
                See More Places
              </button>
              <button
                onClick={() => handleSeeMore("posts")}
                className="flex-1 py-2.5 text-xs font-semibold text-primary hover:bg-secondary/30 transition-colors"
              >
                See More Posts
              </button>
            </div>
          </div>
        )}

        {/* Find My Pet button */}
        <button
          onClick={() => navigate("/find-my-pet")}
          className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-between rounded-2xl bg-card p-3 petkeep-card-shadow hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-petkeep-mint/15">
              <Locate className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold font-display">🐾 Find My Pet</p>
              <p className="text-[11px] text-muted-foreground">GPS tracking & safe zones</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Map — tappable to go fullscreen */}
        <div className="mx-4 mt-3 relative">
          {loading ? (
            <Skeleton className="h-[45vh] w-full rounded-2xl" />
          ) : (
            <>
              <button
                onClick={() => setFullscreenOpen(true)}
                className="absolute top-3 right-3 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-card/90 shadow-lg border border-border backdrop-blur-sm"
                aria-label="Open fullscreen map"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <div onClick={() => setFullscreenOpen(true)} className="cursor-pointer">
                <Suspense fallback={<Skeleton className="h-[45vh] w-full rounded-2xl" />}>
                  <ExploreMap markers={allMarkers} center={center} userLocation={userLocation} />
                </Suspense>
              </div>
            </>
          )}
        </div>

        {/* Nearby sections */}
        <div className="mt-2 pb-4">
          <NearbySection title="Nearby Pet Shops" items={nearbyByCategory.stores} onItemClick={handleNearbyClick} />
          <NearbySection title="Nearby Veterinarians" items={nearbyByCategory.vets} onItemClick={handleNearbyClick} />
          <NearbySection title="Nearby Parks" items={nearbyByCategory.parks} onItemClick={handleNearbyClick} />
          <NearbySection title="Nearby Grooming Salons" items={nearbyByCategory.grooming} onItemClick={handleNearbyClick} />
          <NearbySection title="Nearby Pet Friendly Cafes" items={nearbyByCategory.cafes} onItemClick={handleNearbyClick} />
        </div>
        </div>
      </div>


      {/* Fullscreen Map */}
      <FullscreenMap
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        markers={allMarkers}
        center={center}
        nearbyItems={allNearbyItems}
        findMyPet={false}
        userLocation={userLocation}
        onRequestLocation={requestLocation}
      />
      <ExplorePermissionDialog />
    </AppLayout>
  );
};

export default ExplorePage;
