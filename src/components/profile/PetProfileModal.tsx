import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Camera, X, Save, MessageCircle } from "lucide-react";
import PetVerificationSection from "./PetVerificationSection";
import PetMedicationsSection from "./PetMedicationsSection";
import { animalTypes, temperaments } from "@/data/petBreeds";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PetProfileModalProps {
  pet: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner: boolean;
  onEdit: (pet: any) => void;
  onDelete: (petId: string) => void;
  onPetUpdated?: () => void;
  onContact?: (ownerId: string) => void;
}

const PetProfileModal = ({ pet, open, onOpenChange, isOwner, onEdit, onDelete, onPetUpdated, onContact }: PetProfileModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (pet) {
      setForm({
        name: pet.name || "",
        breed: pet.breed || "",
        age: pet.age || "",
        gender: pet.gender || "",
        weight: pet.weight || "",
        vaccinated: pet.vaccinated || false,
        neutered: pet.neutered || false,
        medical_notes: pet.medical_notes || "",
        special_care: pet.special_care || "",
        temperament: pet.temperament || "",
        emergency_contact: pet.emergency_contact || "",
        vet_info: pet.vet_info || "",
        photo_url: pet.photo_url || "",
      });
      setEditing(false);
    }
  }, [pet]);

  if (!pet) return null;

  const emoji = animalTypes.find(a => a.value === pet.animal_type)?.emoji || "🐾";
  const update = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("pet-photos").upload(filePath, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("pet-photos").getPublicUrl(filePath);
    update("photo_url", publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Pet name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pets").update({
      name: form.name,
      breed: form.breed,
      age: form.age,
      gender: form.gender,
      weight: form.weight,
      vaccinated: form.vaccinated,
      neutered: form.neutered,
      medical_notes: form.medical_notes,
      special_care: form.special_care,
      temperament: form.temperament,
      emergency_contact: form.emergency_contact,
      vet_info: form.vet_info,
      photo_url: form.photo_url,
    }).eq("id", pet.id);
    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pet updated!" });
      setEditing(false);
      onPetUpdated?.();
    }
  };

  const handleCancel = () => {
    setForm({
      name: pet.name || "",
      breed: pet.breed || "",
      age: pet.age || "",
      gender: pet.gender || "",
      weight: pet.weight || "",
      vaccinated: pet.vaccinated || false,
      neutered: pet.neutered || false,
      medical_notes: pet.medical_notes || "",
      special_care: pet.special_care || "",
      temperament: pet.temperament || "",
      emergency_contact: pet.emergency_contact || "",
      vet_info: pet.vet_info || "",
      photo_url: pet.photo_url || "",
    });
    setEditing(false);
  };

  const InfoRow = ({ label, value, field }: { label: string; value: string | null | undefined; field?: string }) => {
    if (!editing && !value) return null;
    return (
      <div className="flex justify-between items-center py-2 border-b border-border last:border-0 gap-2">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        {editing && field ? (
          <Input
            value={form[field] || ""}
            onChange={(e) => update(field, e.target.value)}
            className="max-w-[180px] h-8 text-sm text-right"
          />
        ) : (
          <span className="text-sm font-semibold text-right">{value}</span>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Photo */}
        <div className="relative">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {(editing ? form.photo_url : pet.photo_url) ? (
            <img src={editing ? form.photo_url : pet.photo_url} alt={pet.name} className="w-full aspect-square object-cover" />
          ) : (
            <div className="w-full aspect-square bg-secondary flex items-center justify-center text-6xl">{emoji}</div>
          )}
          {editing && (
            <label className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground cursor-pointer shadow-lg">
              <Camera className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          )}
        </div>

        <div className="p-4 space-y-1">
          {/* Header */}
          <div className="flex items-center justify-between">
            {editing ? (
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="font-display text-xl font-extrabold h-9 max-w-[200px]"
                placeholder="Pet name"
              />
            ) : (
              <h2 className="font-display text-xl font-extrabold">{pet.name}</h2>
            )}
            {isOwner && !editing && (
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { onOpenChange(false); onDelete(pet.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {editing && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="petkeep-gradient text-primary-foreground">
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>

          {/* Tags */}
          {!editing && (
            <div className="mt-1 flex flex-wrap gap-1">
              {pet.vaccinated && <span className="rounded-full bg-petkeep-mint-light px-2 py-0.5 text-[10px] font-bold text-accent">✓ Vaccinated</span>}
              {pet.neutered && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">✓ Neutered</span>}
              {pet.temperament && <span className="rounded-full bg-petkeep-cream px-2 py-0.5 text-[10px] font-bold">{pet.temperament}</span>}
            </div>
          )}

          {/* Toggles in edit mode */}
          {editing && (
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Gender</Label>
                <div className="flex gap-2">
                  {["Male", "Female"].map(g => (
                    <button
                      key={g}
                      onClick={() => update("gender", g)}
                      className={`flex-1 rounded-lg border-2 py-1.5 text-xs font-semibold transition-colors ${
                        form.gender === g ? "border-primary bg-primary/5 text-primary" : "border-border"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Vaccinated</Label>
                <Switch checked={form.vaccinated} onCheckedChange={(v) => update("vaccinated", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Neutered / Spayed</Label>
                <Switch checked={form.neutered} onCheckedChange={(v) => update("neutered", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Temperament</Label>
                <div className="flex flex-wrap gap-1">
                  {temperaments.map(t => (
                    <button
                      key={t}
                      onClick={() => update("temperament", t)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                        form.temperament === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Info rows */}
          <div className="mt-3">
            <InfoRow label="Animal Type" value={pet.animal_type} />
            <InfoRow label="Breed" value={editing ? form.breed : pet.breed} field="breed" />
            <InfoRow label="Age" value={editing ? form.age : pet.age} field="age" />
            {!editing && <InfoRow label="Gender" value={pet.gender} />}
            <InfoRow label="Weight" value={editing ? form.weight : (pet.weight ? `${pet.weight}` : null)} field="weight" />
            {editing ? (
              <div className="py-2 border-b border-border space-y-1">
                <Label className="text-xs text-muted-foreground">Medical Notes</Label>
                <Textarea value={form.medical_notes} onChange={(e) => update("medical_notes", e.target.value)} rows={2} className="text-sm" />
              </div>
            ) : (
              <InfoRow label="Medical Notes" value={pet.medical_notes} />
            )}
            {editing ? (
              <div className="py-2 border-b border-border space-y-1">
                <Label className="text-xs text-muted-foreground">Special Care</Label>
                <Textarea value={form.special_care} onChange={(e) => update("special_care", e.target.value)} rows={2} className="text-sm" />
              </div>
            ) : (
              <InfoRow label="Special Care" value={pet.special_care} />
            )}
            <InfoRow label="Emergency Contact" value={editing ? form.emergency_contact : pet.emergency_contact} field="emergency_contact" />
            <InfoRow label="Vet Info" value={editing ? form.vet_info : pet.vet_info} field="vet_info" />
          </div>

          {/* Verification section - owner view */}
          {isOwner && !editing && (
            <div className="mt-4">
              <PetVerificationSection petId={pet.id} onStatusChange={onPetUpdated} />
            </div>
          )}

          {/* Contact button - non-owner view */}
          {!isOwner && onContact && pet.owner_id && (
            <Button
              onClick={() => onContact(pet.owner_id)}
              className="w-full mt-4 petkeep-gradient text-primary-foreground font-bold"
            >
              <MessageCircle className="h-4 w-4 mr-2" /> Message Owner
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PetProfileModal;
