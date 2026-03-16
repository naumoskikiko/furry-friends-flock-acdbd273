import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePlaces, PLACE_CATEGORIES, getCategoryEmoji, type Place, type PlaceInsert } from "@/hooks/usePlaces";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, Trash2, MapPin, Upload, X, Search,
  ArrowUpDown, CheckSquare, Square, Filter, MoreVertical,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const emptyForm = {
  name: "", category: "pet-shop", description: "",
  latitude: 41.9981, longitude: 21.4254,
  address: "", phone: "", website: "",
  rating: 0, opening_hours: "", image_url: "",
};

type SortKey = "newest" | "oldest" | "alpha" | "city";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest Added" },
  { value: "oldest", label: "Oldest Added" },
  { value: "alpha", label: "Alphabetical" },
  { value: "city", label: "City" },
];

const SettingsMapManagement = () => {
  const { user } = useAuth();
  const { places, loading, addPlace, updatePlace, deletePlace } = usePlaces();

  // Filters & search
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("pet-shop");

  // Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const mapPickerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  // Filtered & sorted places
  const filteredPlaces = useMemo(() => {
    let result = [...places];

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.address && p.address.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q) ||
          PLACE_CATEGORIES.find((c) => c.value === p.category)?.label.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "alpha":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "city":
        result.sort((a, b) => (a.address || "").localeCompare(b.address || ""));
        break;
      case "newest":
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  }, [places, categoryFilter, searchQuery, sortBy]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: places.length };
    PLACE_CATEGORIES.forEach((c) => { counts[c.value] = 0; });
    places.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [places]);

  // Bulk helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredPlaces.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlaces.map((p) => p.id)));
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} places?`)) return;
    for (const id of selectedIds) {
      await deletePlace(id);
    }
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} places deleted`);
  };

  const bulkChangeCategory = async () => {
    for (const id of selectedIds) {
      await updatePlace(id, { category: bulkCategory });
    }
    setSelectedIds(new Set());
    setBulkCategoryDialogOpen(false);
    toast.success("Categories updated");
  };

  // Edit form helpers
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (place: Place) => {
    setEditingId(place.id);
    setForm({
      name: place.name, category: place.category,
      description: place.description || "", latitude: place.latitude,
      longitude: place.longitude, address: place.address || "",
      phone: place.phone || "", website: place.website || "",
      rating: place.rating || 0, opening_hours: place.opening_hours || "",
      image_url: place.image_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
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

  const quickChangeCategory = async (id: string, category: string) => {
    await updatePlace(id, { category });
    toast.success("Category changed");
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

  // Map picker
  const initMapPicker = useCallback(() => {
    if (!mapPickerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapPickerRef.current, {
      center: [form.latitude, form.longitude], zoom: 14, zoomControl: true,
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
    <div className="px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{filteredPlaces.length} of {places.length} places</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={bulkMode ? "default" : "outline"}
            onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
            className="gap-1 text-xs"
          >
            <CheckSquare className="h-3.5 w-3.5" /> Bulk
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, city, category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          All ({categoryCounts.all})
        </button>
        {PLACE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              categoryFilter === c.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {getCategoryEmoji(c.value)} {c.label} ({categoryCounts[c.value] || 0})
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 p-2.5 border border-primary/20">
          <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={selectAll}>
            {selectedIds.size === filteredPlaces.length ? "Deselect All" : "Select All"}
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setBulkCategoryDialogOpen(true)}>
            Change Category
          </Button>
          <Button size="sm" variant="destructive" className="text-xs h-7" onClick={bulkDelete}>
            Delete
          </Button>
        </div>
      )}

      {/* Places list */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : filteredPlaces.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {searchQuery || categoryFilter !== "all" ? "No places match your filters" : "No places yet. Add one!"}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredPlaces.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-card p-3 border border-border">
              {bulkMode && (
                <button onClick={() => toggleSelect(p.id)} className="shrink-0">
                  {selectedIds.has(p.id) ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              )}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-secondary shrink-0">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openEdit(p)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Quick category change submenu */}
                  {PLACE_CATEGORIES.filter((c) => c.value !== p.category).slice(0, 5).map((c) => (
                    <DropdownMenuItem key={c.value} onClick={() => quickChangeCategory(p.id, c.value)}>
                      {getCategoryEmoji(c.value)} Move to {c.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Bulk category change dialog */}
      <Dialog open={bulkCategoryDialogOpen} onOpenChange={setBulkCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Category ({selectedIds.size} places)</DialogTitle></DialogHeader>
          <Select value={bulkCategory} onValueChange={setBulkCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLACE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{getCategoryEmoji(c.value)} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={bulkChangeCategory} className="w-full">Apply to {selectedIds.size} Places</Button>
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
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

            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={(e) => setField("latitude", parseFloat(e.target.value) || 0)} />
              <Input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={(e) => setField("longitude", parseFloat(e.target.value) || 0)} />
            </div>
            <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setShowMapPicker(!showMapPicker)}>
              <MapPin className="h-4 w-4" />
              {showMapPicker ? "Hide Map" : "Select Location on Map"}
            </Button>
            {showMapPicker && (
              <div ref={mapPickerRef} className="rounded-xl overflow-hidden border border-border" style={{ height: 220, width: "100%" }} />
            )}

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              <Input placeholder="Website" value={form.website} onChange={(e) => setField("website", e.target.value)} />
            </div>
            <Input placeholder="Opening Hours (e.g. Mon-Fri 9-18)" value={form.opening_hours} onChange={(e) => setField("opening_hours", e.target.value)} />
            <Input type="number" step="0.1" min="0" max="5" placeholder="Rating (0-5)" value={form.rating} onChange={(e) => setField("rating", parseFloat(e.target.value) || 0)} />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Photo</p>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="" className="h-32 w-full rounded-xl object-cover" />
                  <button onClick={() => setField("image_url", "")} className="absolute top-2 right-2 rounded-full bg-background/80 p-1">
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
