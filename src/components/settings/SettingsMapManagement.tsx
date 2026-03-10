import { useState } from "react";
import { usePlaces, PLACE_CATEGORIES, getCategoryEmoji, type Place, type PlaceInsert } from "@/hooks/usePlaces";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const emptyForm = {
  name: "",
  category: "vet",
  description: "",
  latitude: 41.9981,
  longitude: 21.4254,
  address: "",
  phone: "",
  website: "",
  rating: 0,
};

const SettingsMapManagement = () => {
  const { user } = useAuth();
  const { places, loading, addPlace, updatePlace, deletePlace } = usePlaces();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (place: Place) => {
    setEditingId(place.id);
    setForm({
      name: place.name,
      category: place.category,
      description: place.description || "",
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address || "",
      phone: place.phone || "",
      website: place.website || "",
      rating: place.rating || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updatePlace(editingId, form);
        toast.success("Place updated");
      } else {
        await addPlace({ ...form, created_by: user!.id } as PlaceInsert);
        toast.success("Place added");
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this place?")) return;
    try {
      await deletePlace(id);
      toast.success("Place deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{places.length} places on the map</p>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Place
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : places.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No places yet. Add one!</p>
      ) : (
        <div className="space-y-2">
          {places.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg shrink-0">
                {getCategoryEmoji(p.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {PLACE_CATEGORIES.find((c) => c.value === p.category)?.label} · {p.address || "No address"}
                </p>
              </div>
              <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-secondary">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Place" : "Add New Place"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setField("name", e.target.value)} />
            <Select value={form.category} onValueChange={(v) => setField("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLACE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{getCategoryEmoji(c.value)} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setField("address", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={(e) => setField("latitude", parseFloat(e.target.value) || 0)} />
              <Input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={(e) => setField("longitude", parseFloat(e.target.value) || 0)} />
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Tip: Use Google Maps to get coordinates
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              <Input placeholder="Website" value={form.website} onChange={(e) => setField("website", e.target.value)} />
            </div>
            <Input type="number" step="0.1" min="0" max="5" placeholder="Rating (0-5)" value={form.rating} onChange={(e) => setField("rating", parseFloat(e.target.value) || 0)} />
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update Place" : "Add Place"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsMapManagement;
