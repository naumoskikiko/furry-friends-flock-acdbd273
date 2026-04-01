import { useState, useCallback } from "react";
import { useTabRefresh } from "@/hooks/useTabRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import AppLayout from "@/components/AppLayout";
import { Star, BadgeCheck, MapPin, ChevronRight, Search, Briefcase, Clock, History, Heart } from "lucide-react";
import InfiniteScrollSentinel from "@/components/InfiniteScrollSentinel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCareProviders, useMyProvider, useMyBookings, useProviderAvailability, CATEGORIES, type CareProvider } from "@/hooks/useCare";
import ProviderDashboard from "@/components/care/ProviderDashboard";
import BookingHistory from "@/components/care/BookingHistory";
import { useNavigate } from "react-router-dom";

import { useBoostedIds } from "@/hooks/useBoosts";
import PetMatchTab from "@/components/care/tabs/PetMatchTab";

const ProviderStatusBadge = ({ providerId }: { providerId: string }) => {
  const availability = useProviderAvailability(providerId);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dayAvail = availability.find((a) => a.day_of_week === dayOfWeek && a.is_available);
  const isOpen = dayAvail && currentTime >= dayAvail.start_time.slice(0, 5) && currentTime <= dayAvail.end_time.slice(0, 5);

  if (availability.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
      isOpen ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-green-500" : "bg-muted-foreground/50"}`} />
      {isOpen ? "Open" : "Closed"}
    </span>
  );
};

const CarePage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { providers, loading, hasMore, loadMore } = useCareProviders(activeCategory, searchQuery);
  const { provider: myProvider } = useMyProvider();
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPetMatch, setShowPetMatch] = useState(false);
  
  const boostedProviderIds = useBoostedIds("provider");

  const refreshCare = useCallback(async () => {
    setSearchQuery("");
    setSearchInput("");
    setActiveCategory("all");
    setSelectedProvider(null);
    setShowDashboard(false);
    setShowHistory(false);
    setShowPetMatch(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useTabRefresh("/care", refreshCare);

  const { refreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: refreshCare });

  const handleSearch = (q: string) => {
    setSearchInput(q);
    if (q.length >= 2 || q.length === 0) setSearchQuery(q);
  };

  // Featured = top rated
  const featured = providers.filter((p) => p.avg_rating >= 4.5).slice(0, 3);
  const allProviders = providers;

  const allCategories = [{ value: "all", label: "All", icon: "🐾" }, ...CATEGORIES];

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <PullToRefreshIndicator refreshing={refreshing} pullDistance={pullDistance} />
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Pet Care</h1>
            <p className="text-sm text-muted-foreground">Find trusted providers near you</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1 rounded-xl border border-border px-2.5 py-2 text-xs font-bold hover:bg-secondary transition-colors"
            >
              <History className="h-3.5 w-3.5" />
            </button>
            {!myProvider && (
              <button
                onClick={() => setShowPetMatch(true)}
                className="flex items-center gap-1.5 rounded-xl border border-pink-300 dark:border-pink-700 bg-pink-50 dark:bg-pink-900/20 px-3 py-2 text-xs font-bold text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
              >
                <Heart className="h-3.5 w-3.5" />
                PetMatch
              </button>
            )}
            {myProvider && (
              <button
                onClick={() => setShowDashboard(true)}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-secondary transition-colors"
              >
                <Briefcase className="h-3.5 w-3.5" />
                Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search providers, services..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {allCategories.map((c) => (
            <button
              key={c.value}
              onClick={() => setActiveCategory(c.value)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === c.value
                  ? "petkeep-gradient text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Featured section */}
        {featured.length > 0 && !searchQuery && (
          <div className="px-4 pb-4">
            <h3 className="font-display text-base font-bold mb-2">⭐ Top Rated</h3>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {featured.map((p) => {
                const catInfo = CATEGORIES.find((c) => c.value === p.category);
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/provider/${p.id}`)}
                    className="min-w-[200px] rounded-2xl bg-card border border-border p-3.5 text-left petkeep-card-hover shrink-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.photo_url || p.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                          {catInfo?.icon || "🐾"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold truncate">{p.business_name}</p>
                          {p.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                          
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {Number(p.avg_rating).toFixed(1)} ({p.total_reviews})
                        </div>
                        <ProviderStatusBadge providerId={p.id} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}


        {/* All providers */}
        <div className="px-4 pb-4">
          {!searchQuery && <h3 className="font-display text-base font-bold mb-2">All Providers</h3>}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : allProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-2">🐾</span>
              <p className="text-sm font-semibold">No providers found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search" : "Be the first to offer care services!"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {allProviders.map((p) => {
                  const catInfo = CATEGORIES.find((c) => c.value === p.category);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/provider/${p.id}`)}
                      className="w-full rounded-2xl bg-card p-4 border border-border text-left petkeep-card-hover transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={p.photo_url || p.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xl font-bold text-primary-foreground">
                            {catInfo?.icon || "🐾"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-display text-base font-bold truncate">{p.business_name}</h3>
                            {p.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              {Number(p.avg_rating).toFixed(1)}
                            </span>
                            <span>({p.total_reviews} reviews)</span>
                            {p.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {p.location}
                              </span>
                            )}
                            <ProviderStatusBadge providerId={p.id} />
                          </div>
                          {p.description && (
                            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                              {catInfo?.icon} {catInfo?.label || p.category}
                            </span>
                            {p.response_time_minutes && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> ~{p.response_time_minutes}min
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
              <InfiniteScrollSentinel loading={loading} hasMore={hasMore} onLoadMore={loadMore} itemCount={providers.length} />
            </>
          )}
        </div>
      </div>

      {/* Provider detail modal */}
      {selectedProvider && (
        <ProviderDetail provider={selectedProvider} onClose={() => setSelectedProvider(null)} />
      )}

      {/* Provider dashboard */}
      {showDashboard && (
        <ProviderDashboard onClose={() => setShowDashboard(false)} />
      )}

      {/* Booking history */}
      {showHistory && (
        <BookingHistory onClose={() => setShowHistory(false)} />
      )}

      {/* PetMatch fullscreen modal for normal users */}
      {showPetMatch && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="mx-auto max-w-lg min-h-screen">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
              <button onClick={() => setShowPetMatch(false)} className="rounded-full p-1.5 hover:bg-secondary">
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
              <Heart className="h-5 w-5 text-pink-500" />
              <h1 className="font-display text-lg font-bold">PetMatch</h1>
            </div>
            <div className="px-4 py-4 pb-24">
              <PetMatchTab />
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
};

export default CarePage;
