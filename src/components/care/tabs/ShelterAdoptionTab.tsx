import { useState } from "react";
import { Plus, Trash2, X, Home, Edit2, ImageIcon } from "lucide-react";
import { useShelterListings, type AdoptionListing } from "@/hooks/useCare";
import { animalTypes } from "@/data/petBreeds";
import { useToast } from "@/hooks/use-toast";

interface Props {
  providerId: string;
}

const ShelterAdoptionTab = ({ providerId }: Props) => {
  const { listings, addListing, updateListing, deleteListing } = useShelterListings(providerId);
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("dog");
  const [formBreed, setFormBreed] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formImages, setFormImages] = useState("");

  const resetForm = () => {
    setFormName(""); setFormType("dog"); setFormBreed(""); setFormAge("");
    setFormGender(""); setFormDesc(""); setFormLocation(""); setFormImages("");
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!formName.trim()) return;
    try {
      const imageUrls = formImages.split("\n").map(u => u.trim()).filter(Boolean);
      await addListing({
        name: formName.trim(),
        animal_type: formType,
        breed: formBreed.trim(),
        age: formAge.trim(),
        gender: formGender,
        description: formDesc.trim(),
        location: formLocation.trim(),
      }, imageUrls);
      toast({ title: "Pet listed for adoption! 🐾" });
      resetForm();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleMarkAdopted = async (listing: AdoptionListing) => {
    await updateListing(listing.id, { status: "adopted" });
    toast({ title: `${listing.name} marked as adopted! 🏠❤️` });
  };

  const handleMarkAvailable = async (listing: AdoptionListing) => {
    await updateListing(listing.id, { status: "available" });
    toast({ title: `${listing.name} is available again` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          🐾 Pets for Adoption
        </h3>
        <span className="text-xs text-muted-foreground">{listings.filter(l => l.status === "available").length} available</span>
      </div>

      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full rounded-xl border-2 border-dashed border-border py-4 text-sm font-bold text-primary hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Add Pet for Adoption
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">New Adoption Listing</h3>
            <button onClick={resetForm} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Pet name *"
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
          <div className="flex gap-2">
            <select value={formType} onChange={(e) => setFormType(e.target.value)}
              className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none">
              {animalTypes.map(a => (
                <option key={a.value} value={a.value}>{a.emoji} {a.label}</option>
              ))}
            </select>
            <select value={formGender} onChange={(e) => setFormGender(e.target.value)}
              className="w-28 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none">
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input value={formBreed} onChange={(e) => setFormBreed(e.target.value)} placeholder="Breed"
              className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
            <input value={formAge} onChange={(e) => setFormAge(e.target.value)} placeholder="Age (e.g. 2 years)"
              className="w-32 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
          </div>
          <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Description (personality, history, needs...)" rows={3}
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none resize-none" />
          <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="Location"
            className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
          <div>
            <label className="text-[10px] text-muted-foreground font-semibold">Image URLs (one per line)</label>
            <textarea value={formImages} onChange={(e) => setFormImages(e.target.value)} placeholder="https://example.com/photo.jpg" rows={2}
              className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none resize-none mt-1" />
          </div>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold">Cancel</button>
            <button onClick={handleAdd} disabled={!formName.trim()}
              className="flex-1 petkeep-gradient rounded-xl py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
              List for Adoption
            </button>
          </div>
        </div>
      )}

      {listings.length === 0 && !showForm && (
        <div className="text-center py-8">
          <span className="text-3xl">🏠</span>
          <p className="text-sm font-semibold mt-2">No pets listed yet</p>
          <p className="text-xs text-muted-foreground">Add your first pet to help them find a home</p>
        </div>
      )}

      {listings.map((listing) => {
        const emoji = animalTypes.find(a => a.value === listing.animal_type)?.emoji || "🐾";
        const isAdopted = listing.status === "adopted";

        return (
          <div key={listing.id} className={`rounded-2xl bg-card border border-border overflow-hidden ${isAdopted ? "opacity-70" : ""}`}>
            {listing.images && listing.images.length > 0 && (
              <div className="h-32 overflow-hidden">
                <img src={listing.images[0].image_url} alt={listing.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span>{emoji}</span>
                    <h3 className="text-sm font-bold">{listing.name}</h3>
                    {isAdopted && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Adopted 🏠
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {listing.breed && <span>{listing.breed}</span>}
                    {listing.age && <span>· {listing.age}</span>}
                    {listing.gender && <span>· {listing.gender}</span>}
                  </div>
                  {listing.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{listing.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isAdopted ? (
                    <button onClick={() => handleMarkAdopted(listing)}
                      className="rounded-full p-1.5 hover:bg-primary/10 text-primary" title="Mark as adopted">
                      <Home className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => handleMarkAvailable(listing)}
                      className="rounded-full p-1.5 hover:bg-secondary text-muted-foreground" title="Mark as available">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => deleteListing(listing.id)}
                    className="rounded-full p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ShelterAdoptionTab;
