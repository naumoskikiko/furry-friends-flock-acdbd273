import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PawPrint, Plus, Pencil, Trash2, Home, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { animalTypes } from "@/data/petBreeds";

const fromTable = (table: string) => (supabase as any).from(table);

interface AdoptionListing {
  id: string;
  name: string;
  animal_type: string;
  breed: string;
  age: string;
  gender: string;
  description: string;
  location: string;
  status: string;
  provider_id: string;
  user_id: string;
  created_at: string;
  provider?: { business_name: string };
  images?: { image_url: string }[];
}

const ShelterManagementPanel = () => {
  const { toast } = useToast();
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", breed: "", age: "", gender: "", description: "", location: "", status: "" });

  const fetchListings = async () => {
    setLoading(true);
    const { data } = await fromTable("adoption_listings").select("*").order("created_at", { ascending: false });
    if (!data) { setLoading(false); return; }

    const providerIds = [...new Set((data as any[]).map((l: any) => l.provider_id))];
    const listingIds = (data as any[]).map((l: any) => l.id);

    const [{ data: providers }, { data: images }] = await Promise.all([
      fromTable("care_providers").select("id, business_name").in("id", providerIds.length ? providerIds : [""]),
      fromTable("adoption_images").select("listing_id, image_url").in("listing_id", listingIds.length ? listingIds : [""]),
    ]);

    const providerMap = Object.fromEntries((providers || []).map((p: any) => [p.id, p]));

    setListings((data as any[]).map((l: any) => ({
      ...l,
      provider: providerMap[l.provider_id],
      images: (images || []).filter((i: any) => i.listing_id === l.id),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);

  const startEdit = (l: AdoptionListing) => {
    setEditId(l.id);
    setEditForm({
      name: l.name,
      breed: l.breed || "",
      age: l.age || "",
      gender: l.gender || "",
      description: l.description || "",
      location: l.location || "",
      status: l.status,
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const { error } = await fromTable("adoption_listings").update(editForm).eq("id", editId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Listing updated" });
      setEditId(null);
      fetchListings();
    }
  };

  const markAdopted = async (id: string) => {
    await fromTable("adoption_listings").update({ status: "adopted" }).eq("id", id);
    toast({ title: "Marked as adopted 🏠" });
    fetchListings();
  };

  const deleteListing = async (id: string) => {
    await fromTable("adoption_images").delete().eq("listing_id", id);
    await fromTable("adoption_listings").delete().eq("id", id);
    toast({ title: "Listing deleted" });
    fetchListings();
  };

  const filtered = filter === "all" ? listings : listings.filter(l => l.status === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      <h2 className="font-display text-lg font-bold">🏠 Shelter & Adoption</h2>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {["all", "available", "adopted"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({listings.filter(l => f === "all" || l.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">🐾</span>
          <p className="text-sm font-semibold mt-2">No adoption listings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => {
            const emoji = animalTypes.find(a => a.value === l.animal_type)?.emoji || "🐾";
            const isEditing = editId === l.id;

            return (
              <div key={l.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                {/* Image */}
                {l.images?.[0] && (
                  <img src={l.images[0].image_url} alt={l.name} className="w-full h-32 object-cover" />
                )}
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editForm.breed} onChange={e => setEditForm(f => ({ ...f, breed: e.target.value }))} placeholder="Breed" />
                        <Input value={editForm.age} onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} placeholder="Age" />
                      </div>
                      <Input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" />
                      <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} className="flex-1">Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{emoji}</span>
                          <div>
                            <p className="text-sm font-bold">{l.name}</p>
                            <p className="text-[10px] text-muted-foreground">{l.breed} • {l.age} • {l.provider?.business_name}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                          l.status === "adopted" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {l.status === "adopted" ? "Adopted 🏠" : "Available"}
                        </span>
                      </div>
                      {l.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{l.description}</p>}
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => startEdit(l)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        {l.status === "available" && (
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-primary" onClick={() => markAdopted(l.id)}>
                            <Home className="h-3.5 w-3.5 mr-1" /> Mark Adopted
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => deleteListing(l.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShelterManagementPanel;
