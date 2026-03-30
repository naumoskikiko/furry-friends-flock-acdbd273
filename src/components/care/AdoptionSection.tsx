import { useState } from "react";
import { Search, MapPin, ChevronLeft, MessageSquare, ChevronRight, Filter } from "lucide-react";
import { useAdoptionListings, type AdoptionListing } from "@/hooks/useCare";
import { animalTypes } from "@/data/petBreeds";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getOrCreateConversation } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onClose: () => void;
}

const AdoptionSection = ({ onClose }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedListing, setSelectedListing] = useState<AdoptionListing | null>(null);

  const { listings, loading } = useAdoptionListings({
    animal_type: filterType,
    search: searchQuery,
  });

  const handleSearch = (q: string) => {
    setSearchInput(q);
    if (q.length >= 2 || q.length === 0) setSearchQuery(q);
  };

  const handleContactShelter = async (listing: AdoptionListing) => {
    if (!user || !listing.provider) return;
    try {
      const convId = await getOrCreateConversation(listing.provider.user_id);
      navigate(`/messages?conversation=${convId}`);
    } catch {
      toast({ title: "Could not open chat", variant: "destructive" });
    }
  };

  const typeFilters = [{ value: "all", label: "All", emoji: "🐾" }, ...animalTypes.slice(0, 6).map(a => ({ value: a.value, label: a.label, emoji: a.emoji }))];

  // Detail view
  if (selectedListing) {
    const listing = selectedListing;
    const emoji = animalTypes.find(a => a.value === listing.animal_type)?.emoji || "🐾";
    const isAdopted = listing.status === "adopted";

    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <div className="mx-auto max-w-lg min-h-screen">
          {/* Image */}
          {listing.images && listing.images.length > 0 ? (
            <div className="relative h-72">
              <img src={listing.images[0].image_url} alt={listing.name} className="w-full h-full object-cover" />
              <button onClick={() => setSelectedListing(null)}
                className="absolute top-4 left-4 rounded-full bg-background/80 backdrop-blur-sm p-2">
                <ChevronLeft className="h-5 w-5" />
              </button>
              {isAdopted && (
                <div className="absolute top-4 right-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Adopted 🏠
                </div>
              )}
            </div>
          ) : (
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
              <button onClick={() => setSelectedListing(null)} className="rounded-full p-1.5 hover:bg-secondary">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="font-display text-lg font-bold">{listing.name}</h1>
            </div>
          )}

          {/* Additional images */}
          {listing.images && listing.images.length > 1 && (
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
              {listing.images.slice(1).map((img) => (
                <img key={img.id} src={img.image_url} alt="" className="h-20 w-20 rounded-xl object-cover shrink-0" />
              ))}
            </div>
          )}

          <div className="px-4 py-4 space-y-4">
            {/* Name & basics */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{emoji}</span>
                <h1 className="font-display text-xl font-bold">{listing.name}</h1>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                {listing.breed && <span className="font-semibold">{listing.breed}</span>}
                {listing.age && <span>· {listing.age}</span>}
                {listing.gender && <span>· {listing.gender}</span>}
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs font-bold text-muted-foreground mb-1">About</p>
                <p className="text-sm leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Location */}
            {(listing.location || listing.provider?.location) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{listing.location || listing.provider?.location}</span>
              </div>
            )}

            {/* Shelter info */}
            {listing.provider && (
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-bold text-muted-foreground mb-2">Shelter</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={listing.provider.photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">🏠</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold">{listing.provider.business_name}</p>
                    {listing.provider.location && (
                      <p className="text-xs text-muted-foreground">{listing.provider.location}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contact button */}
            {!isAdopted ? (
              <button onClick={() => handleContactShelter(listing)}
                className="w-full petkeep-gradient rounded-xl py-3.5 text-sm font-bold text-primary-foreground flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Contact Shelter
              </button>
            ) : (
              <div className="w-full rounded-xl bg-muted py-3.5 text-center text-sm font-bold text-muted-foreground">
                This pet has been adopted 🏠❤️
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="mx-auto max-w-lg min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold">Adopt a Pet 🐾</h1>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={searchInput} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, breed..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </div>

        {/* Type filters */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {typeFilters.map((t) => (
            <button key={t.value} onClick={() => setFilterType(t.value)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filterType === t.value
                  ? "petkeep-gradient text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Listings grid */}
        <div className="px-4 pb-20">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-2">🐾</span>
              <p className="text-sm font-semibold">No pets available for adoption</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later for new listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map((listing) => {
                const emoji = animalTypes.find(a => a.value === listing.animal_type)?.emoji || "🐾";
                return (
                  <button key={listing.id} onClick={() => setSelectedListing(listing)}
                    className="rounded-2xl bg-card border border-border overflow-hidden text-left petkeep-card-hover transition-all">
                    <div className="h-32 bg-secondary flex items-center justify-center">
                      {listing.images && listing.images.length > 0 ? (
                        <img src={listing.images[0].image_url} alt={listing.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{emoji}</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold truncate">{listing.name}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        {listing.breed && <span className="truncate">{listing.breed}</span>}
                        {listing.age && <span>· {listing.age}</span>}
                      </div>
                      {listing.provider?.location && (
                        <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-1">
                          <MapPin className="h-2.5 w-2.5" />
                          <span className="truncate">{listing.provider.location}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdoptionSection;
