import { useState, useRef, useEffect, useCallback } from "react";
import { usePlaces, PLACE_CATEGORIES, getCategoryEmoji, type Place, type PlaceInsert } from "@/hooks/usePlaces";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, MapPin, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const emptyForm = {
  name: "",
  category: "pet-shop",
  description: "",
  latitude: 41.9981,
  longitude: 21.4254,
  address: "",
  phone: "",
  website: "",
  rating: 0,
  opening_hours: "",
  image_url: "",
};

const SettingsMapManagement = () => {
  const { user } = useAuth();
  const { places, loading, addPlace, updatePlace, deletePlace } = usePlaces();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const mapPickerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

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
      opening_hours: place.opening_hours || "",
      image_url: place.image_url || "",
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `places/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("post-images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setField("image_url", data.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
    setUploading(false);
  };

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  // Map picker logic
  const initMapPicker = useCallback(() => {
    if (!mapPickerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapPickerRef.current, {
      center: [form.latitude, form.longitude],
      zoom: 14,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OSM',
    }).addTo(map);

    const marker = L.marker([form.latitude, form.longitude], { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setField("latitude", pos.lat);
      setField("longitude", pos.lng);
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setField("latitude", e.latlng.lat);
      setField("longitude", e.latlng.lng);
    });

    pickerMarkerRef.current = marker;
    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [form.latitude, form.longitude]);

  useEffect(() => {
    if (showMapPicker) {
      // Small delay for DOM to mount
      const t = setTimeout(initMapPicker, 50);
      return () => clearTimeout(t);
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        pickerMarkerRef.current = null;
      }
    }
  }, [showMapPicker, initMapPicker]);

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
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg shrink-0">
                  {getCategoryEmoji(p.category)}
                </div>
              )}
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

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setShowMapPicker(false); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Place" : "Add New Place"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Place Name *" value={form.name} onChange={(e) => setField("name", e.target.value)} />
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
            
            {/* Coordinates + Map Picker */}
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={(e) => setField("latitude", parseFloat(e.target.value) || 0)} />
              <Input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={(e) => setField("longitude", parseFloat(e.target.value) || 0)} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setShowMapPicker(!showMapPicker)}
            >
              <MapPin className="h-4 w-4" />
              {showMapPicker ? "Hide Map" : "Select Location on Map"}
            </Button>
            {showMapPicker && (
              <div
                ref={mapPickerRef}
                className="rounded-xl overflow-hidden border border-border"
                style={{ height: 220, width: "100%" }}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              <Input placeholder="Website" value={form.website} onChange={(e) => setField("website", e.target.value)} />
            </div>
            <Input placeholder="Opening Hours (e.g. Mon-Fri 9-18)" value={form.opening_hours} onChange={(e) => setField("opening_hours", e.target.value)} />
            <Input type="number" step="0.1" min="0" max="5" placeholder="Rating (0-5)" value={form.rating} onChange={(e) => setField("rating", parseFloat(e.target.value) || 0)} />

            {/* Photo Upload */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Photo</p>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="" className="h-32 w-full rounded-xl object-cover" />
                  <button
                    onClick={() => setField("image_url", "")}
                    className="absolute top-2 right-2 rounded-full bg-background/80 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Upload Photo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>

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
