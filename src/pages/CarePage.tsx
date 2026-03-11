import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Star, BadgeCheck, MapPin, ChevronRight, Search, Briefcase, Clock, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCareProviders, useMyProvider, useMyBookings, useProviderAvailability, CATEGORIES, type CareProvider } from "@/hooks/useCare";
import ProviderDetail from "@/components/care/ProviderDetail";
import ProviderDashboard from "@/components/care/ProviderDashboard";
import BookingHistory from "@/components/care/BookingHistory";
import BoostBadge from "@/components/marketplace/BoostBadge";
import { useBoostedIds } from "@/hooks/useBoosts";

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
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { providers, loading } = useCareProviders(activeCategory, searchQuery);
  const { provider: myProvider } = useMyProvider();
  const [selectedProvider, setSelectedProvider] = useState<CareProvider | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
      <div className="mx-auto max-w-lg">
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
            <button
              onClick={() => setShowDashboard(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-secondary transition-colors"
            >
              <Briefcase className="h-3.5 w-3.5" />
              {myProvider ? "Dashboard" : "Become Provider"}
            </button>
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
                    onClick={() => setSelectedProvider(p)}
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
            <div className="space-y-3">
              {allProviders.map((p) => {
                const catInfo = CATEGORIES.find((c) => c.value === p.category);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p)}
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
    </AppLayout>
  );
};

export default CarePage;
