import { useState } from "react";
import { Search, MapPin, ChevronLeft, MessageSquare, Phone, Heart, Send } from "lucide-react";
import { useAdoptionListings, type AdoptionListing } from "@/hooks/useCare";
import { animalTypes } from "@/data/petBreeds";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getOrCreateConversation } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

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
      // Send an intro message about the pet
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        message_text: `Hi! I'm interested in adopting ${listing.name} 🐾`,
        message_type: "text",
      });
      navigate(`/messages?conversation=${convId}`);
    } catch {
      toast({ title: "Could not open chat", variant: "destructive" });
    }
  };

  const handleCallShelter = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSendRequest = async (listing: AdoptionListing) => {
    if (!user || !listing.provider || !requestName.trim()) return;
    setSendingRequest(true);
    try {
      const convId = await getOrCreateConversation(listing.provider.user_id);
      const msg = `📋 Adoption Request for ${listing.name}\n\nName: ${requestName}\n\n${requestMessage || "I would like to adopt this pet."}`;
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        message_text: msg,
        message_type: "text",
      });
      toast({ title: "Adoption request sent! ❤️" });
      setShowRequestForm(false);
      setRequestName("");
      setRequestMessage("");
    } catch {
      toast({ title: "Could not send request", variant: "destructive" });
    } finally {
      setSendingRequest(false);
    }
  };

  const typeFilters = [{ value: "all", label: "All", emoji: "🐾" }, ...animalTypes.slice(0, 6).map(a => ({ value: a.value, label: a.label, emoji: a.emoji }))];

  // Detail view
  if (selectedListing) {
    const listing = selectedListing;
    const emoji = animalTypes.find(a => a.value === listing.animal_type)?.emoji || "🐾";
    const isAdopted = listing.status === "adopted";
    const shelterPhone = listing.provider?.phone;
    const isVerified = listing.provider?.is_verified;

    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <div className="mx-auto max-w-lg min-h-screen pb-32">
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
              {isAdopted && (
                <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">Adopted 🏠</span>
              )}
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

            {/* Shelter info card */}
            {listing.provider && (
              <div className="rounded-2xl border border-border p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground">Shelter</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={listing.provider.photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">🏠</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{listing.provider.business_name}</p>
                    {listing.provider.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {listing.provider.location}
                      </p>
                    )}
                    {shelterPhone && isVerified && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {shelterPhone}
                      </p>
                    )}
                  </div>
                </div>
                {listing.provider.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{listing.provider.description}</p>
                )}
              </div>
            )}

            {/* Contact buttons */}
            {!isAdopted && isVerified ? (
              <div className="space-y-2.5">
                <button onClick={() => handleContactShelter(listing)}
                  className="w-full petkeep-gradient rounded-xl py-3.5 text-sm font-bold text-primary-foreground flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Contact Shelter
                </button>

                {shelterPhone && (
                  <button onClick={() => handleCallShelter(shelterPhone)}
                    className="w-full rounded-xl border-2 border-primary py-3 text-sm font-bold text-primary flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors">
                    <Phone className="h-4 w-4" />
                    Call Shelter
                  </button>
                )}

                <button onClick={() => setShowRequestForm(true)}
                  className="w-full rounded-xl border border-border bg-secondary py-3 text-sm font-bold text-foreground flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors">
                  <Send className="h-4 w-4" />
                  Send Adoption Request
                </button>
              </div>
            ) : isAdopted ? (
              <div className="w-full rounded-xl bg-muted py-3.5 text-center text-sm font-bold text-muted-foreground">
                This pet has been adopted 🏠❤️
              </div>
            ) : (
              <div className="w-full rounded-xl bg-muted py-3.5 text-center text-sm font-bold text-muted-foreground">
                Shelter verification pending
              </div>
            )}
          </div>
        </div>

        {/* Adoption Request Modal */}
        <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Send Adoption Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="rounded-xl bg-secondary/50 p-3 flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-sm font-bold">{listing.name}</p>
                  <p className="text-[10px] text-muted-foreground">{listing.breed} · {listing.age}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Your Name *</label>
                <input
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Message (optional)</label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Tell the shelter why you'd be a great match..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={() => handleSendRequest(listing)}
                disabled={!requestName.trim() || sendingRequest}
                className="w-full petkeep-gradient rounded-xl py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Heart className="h-4 w-4" />
                {sendingRequest ? "Sending..." : "Send Request"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
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
                const isAdopted = listing.status === "adopted";
                return (
                  <button key={listing.id} onClick={() => setSelectedListing(listing)}
                    className="rounded-2xl bg-card border border-border overflow-hidden text-left petkeep-card-hover transition-all relative">
                    {isAdopted && (
                      <div className="absolute top-2 right-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                        Adopted 🏠
                      </div>
                    )}
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
