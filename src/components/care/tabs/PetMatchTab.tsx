import { useState, useEffect, useCallback } from "react";
import { Heart, Plus, PawPrint, Shield, Upload, Trash2, Search, MapPin, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const fromTable = (table: string) => (supabase as any).from(table);

interface Pet {
  id: string;
  name: string;
  animal_type: string;
  breed: string | null;
  gender: string | null;
  age: string | null;
  photo_url: string | null;
  neutered: boolean | null;
}

interface PetMatchListing {
  id: string;
  user_id: string;
  pet_id: string;
  status: string;
  looking_for: string;
  description: string;
  is_active: boolean;
  breed_document_url: string | null;
  breed_document_name: string | null;
  created_at: string;
  pet?: Pet;
  profile?: { full_name: string; avatar_url: string | null; username: string | null };
}

const PetMatchTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [myListings, setMyListings] = useState<PetMatchListing[]>([]);
  const [allListings, setAllListings] = useState<PetMatchListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"browse" | "my">("browse");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPet, setSelectedPet] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [petsRes, myRes, allRes] = await Promise.all([
      supabase.from("pets").select("id, name, animal_type, breed, gender, age, photo_url, neutered").eq("owner_id", user.id),
      fromTable("petmatch_listings").select("*").eq("user_id", user.id),
      fromTable("petmatch_listings").select("*").eq("is_active", true).neq("user_id", user.id),
    ]);

    setPets(petsRes.data || []);
    setMyListings((myRes.data || []) as PetMatchListing[]);

    // Enrich all listings with pet + profile data
    const listings = (allRes.data || []) as PetMatchListing[];
    if (listings.length > 0) {
      const petIds = listings.map((l) => l.pet_id);
      const userIds = [...new Set(listings.map((l) => l.user_id))];
      const [petsData, profilesData] = await Promise.all([
        supabase.from("pets").select("id, name, animal_type, breed, gender, age, photo_url, neutered").in("id", petIds),
        supabase.from("profiles").select("user_id, full_name, avatar_url, username").in("user_id", userIds),
      ]);
      const petsMap = Object.fromEntries((petsData.data || []).map((p: any) => [p.id, p]));
      const profilesMap = Object.fromEntries((profilesData.data || []).map((p: any) => [p.user_id, p]));
      listings.forEach((l) => {
        l.pet = petsMap[l.pet_id];
        l.profile = profilesMap[l.user_id];
      });
    }
    setAllListings(listings.filter((l) => l.status === "approved"));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!selectedPet || !user) return;
    const { error } = await fromTable("petmatch_listings").insert({
      user_id: user.id,
      pet_id: selectedPet,
      looking_for: lookingFor,
      description: description,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "PetMatch listing created!", description: "It will be reviewed before going live." });
    setShowCreate(false);
    setSelectedPet("");
    setLookingFor("");
    setDescription("");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fromTable("petmatch_listings").delete().eq("id", id);
    toast({ title: "Listing removed" });
    fetchData();
  };

  const handleUploadDoc = async (listingId: string, file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/petmatch/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("verification-docs").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = await supabase.storage.from("verification-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
    await fromTable("petmatch_listings").update({
      breed_document_url: urlData?.signedUrl || path,
      breed_document_name: file.name,
    }).eq("id", listingId);
    toast({ title: "Breed document uploaded!" });
    setUploading(false);
    fetchData();
  };

  const listedPetIds = myListings.map((l) => l.pet_id);
  const availablePets = pets.filter((p) => !listedPetIds.includes(p.id));
  const filteredListings = filterType === "all" ? allListings : allListings.filter((l) => l.pet?.animal_type === filterType);

  // No pets state
  if (!loading && pets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <PawPrint className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-display text-lg font-bold">Add a Pet to Use PetMatch</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">You need at least one pet profile to find breeding partners.</p>
        <button onClick={() => navigate("/profile")} className="mt-4 petkeep-gradient rounded-xl px-6 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4 inline mr-1" /> Add Pet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/10 to-primary/10 border border-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold">PetMatch</h3>
            <p className="text-xs text-muted-foreground">Find verified breeding partners for your pet</p>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView("browse")} className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${view === "browse" ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          <Search className="h-3.5 w-3.5 inline mr-1" /> Browse Matches
        </button>
        <button onClick={() => setView("my")} className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${view === "my" ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          <PawPrint className="h-3.5 w-3.5 inline mr-1" /> My Listings ({myListings.length})
        </button>
      </div>

      {view === "my" ? (
        <div className="space-y-3">
          {availablePets.length > 0 && !showCreate && (
            <button onClick={() => setShowCreate(true)} className="w-full rounded-2xl border-2 border-dashed border-primary/30 p-4 text-center hover:bg-primary/5 transition-colors">
              <Plus className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-primary">List a Pet for Matching</p>
            </button>
          )}

          {showCreate && (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <h4 className="text-sm font-bold">New PetMatch Listing</h4>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Select Pet</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availablePets.map((p) => (
                    <button key={p.id} onClick={() => setSelectedPet(p.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${selectedPet === p.id ? "petkeep-gradient text-primary-foreground" : "bg-secondary"}`}>
                      {p.photo_url ? <img src={p.photo_url} className="h-6 w-6 rounded-full object-cover" /> : <PawPrint className="h-4 w-4" />}
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Looking For</label>
                <input value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} placeholder="e.g. Female Golden Retriever, 2-4 years" className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Tell others about your pet and what you're looking for..." className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-bold">Cancel</button>
                <button onClick={handleCreate} disabled={!selectedPet} className="flex-1 petkeep-gradient rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">Create Listing</button>
              </div>
            </div>
          )}

          {myListings.length === 0 && !showCreate ? (
            <div className="text-center py-8">
              <Heart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No listings yet</p>
            </div>
          ) : (
            myListings.map((listing) => {
              const pet = pets.find((p) => p.id === listing.pet_id);
              const statusColors: Record<string, string> = {
                pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                rejected: "bg-destructive/10 text-destructive",
              };
              return (
                <div key={listing.id} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={pet?.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{pet?.name?.[0] || "P"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{pet?.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[listing.status] || "bg-secondary"}`}>{listing.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{pet?.breed} · {pet?.gender} · {pet?.age}</p>
                      {listing.looking_for && <p className="text-xs mt-1"><span className="font-semibold">Looking for:</span> {listing.looking_for}</p>}
                    </div>
                    <button onClick={() => handleDelete(listing.id)} className="rounded-full p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {!listing.breed_document_url && (
                    <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 p-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Upload breed documents for verification</p>
                      </div>
                      <label className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white cursor-pointer">
                        <Upload className="h-3 w-3 inline mr-0.5" /> Upload
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadDoc(listing.id, f); }} />
                      </label>
                    </div>
                  )}
                  {listing.breed_document_url && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-accent" />
                      <span>Document: {listing.breed_document_name}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Filter by animal type */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {["all", "dog", "cat", "bird", "rabbit", "other"].map((t) => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filterType === t ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {t === "all" ? "🐾 All" : t === "dog" ? "🐕 Dogs" : t === "cat" ? "🐈 Cats" : t === "bird" ? "🐦 Birds" : t === "rabbit" ? "🐇 Rabbits" : "🐾 Other"}
              </button>
            ))}
          </div>

          {filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No matches available</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later or list your pet!</p>
            </div>
          ) : (
            filteredListings.map((listing) => (
              <div key={listing.id} className="rounded-2xl bg-card border border-border p-4 petkeep-card-hover">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={listing.pet?.photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-primary text-white font-bold text-lg">{listing.pet?.name?.[0] || "P"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-display text-sm font-bold truncate">{listing.pet?.name}</h4>
                      <BadgeCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">{listing.pet?.breed} · {listing.pet?.gender} · {listing.pet?.age}</p>
                    {listing.looking_for && <p className="text-xs mt-1"><span className="font-semibold">Looking for:</span> {listing.looking_for}</p>}
                    {listing.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{listing.description}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => listing.profile?.username ? navigate(`/user/${listing.profile.username}`) : null}
                        className="flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={listing.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px] bg-primary/10">{listing.profile?.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        {listing.profile?.full_name}
                      </button>
                    </div>
                  </div>
                  <Heart className="h-5 w-5 text-pink-400 shrink-0 mt-1" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PetMatchTab;
