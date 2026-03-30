import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Camera, Search } from "lucide-react";
import { animalTypes, breedsByAnimal, temperaments } from "@/data/petBreeds";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AddPetFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPetAdded: () => void;
  editPet?: any;
}

type Step = "type" | "breed" | "details";

const AddPetFlow = ({ open, onOpenChange, onPetAdded, editPet }: AddPetFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(editPet ? "details" : "type");
  const [saving, setSaving] = useState(false);
  const [breedSearch, setBreedSearch] = useState("");

  const [form, setForm] = useState({
    animal_type: editPet?.animal_type || "",
    breed: editPet?.breed || "",
    name: editPet?.name || "",
    age: editPet?.age || "",
    gender: editPet?.gender || "",
    weight: editPet?.weight || "",
    vaccinated: editPet?.vaccinated || false,
    neutered: editPet?.neutered || false,
    medical_notes: editPet?.medical_notes || "",
    special_care: editPet?.special_care || "",
    temperament: editPet?.temperament || "",
    emergency_contact: editPet?.emergency_contact || "",
    vet_info: editPet?.vet_info || "",
    photo_url: editPet?.photo_url || "",
  });

  const [uploading, setUploading] = useState(false);

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const breeds = breedsByAnimal[form.animal_type] || [];
  const filteredBreeds = breeds.filter(b => b.toLowerCase().includes(breedSearch.toLowerCase()));
  const hasBreeds = breeds.length > 0;

  const handleSelectType = (type: string) => {
    update("animal_type", type);
    if (breedsByAnimal[type]) {
      setStep("breed");
    } else {
      setStep("details");
    }
  };

  const handleSelectBreed = (breed: string) => {
    update("breed", breed);
    setStep("details");
  };

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
    if (!user || !form.name.trim()) {
      toast({ title: "Pet name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, owner_id: user.id };

    let error;
    if (editPet) {
      ({ error } = await supabase.from("pets").update(payload).eq("id", editPet.id));
    } else {
      ({ error } = await supabase.from("pets").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editPet ? "Pet updated!" : "Pet added!" });
      onPetAdded();
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setStep("type");
    setForm({ animal_type: "", breed: "", name: "", age: "", gender: "", weight: "", vaccinated: false, neutered: false, medical_notes: "", special_care: "", temperament: "", emergency_contact: "", vet_info: "", photo_url: "" });
    setBreedSearch("");
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === "details" && hasBreeds) setStep("breed");
    else if (step === "details" || step === "breed") setStep("type");
    else resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== "type" && (
              <button onClick={handleBack} className="rounded-full p-1 hover:bg-secondary">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle>
              {step === "type" ? "Choose Animal Type" : step === "breed" ? "Select Breed" : (editPet ? "Edit Pet" : "Pet Details")}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Step 1: Animal Type */}
        {step === "type" && (
          <div className="grid grid-cols-3 gap-2">
            {animalTypes.map((a) => (
              <button
                key={a.value}
                onClick={() => handleSelectType(a.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all hover:border-primary ${
                  form.animal_type === a.value ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-xs font-semibold">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Breed Selection */}
        {step === "breed" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search breeds..."
                value={breedSearch}
                onChange={(e) => setBreedSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filteredBreeds.map((breed) => (
                <button
                  key={breed}
                  onClick={() => handleSelectBreed(breed)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-secondary ${
                    form.breed === breed ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  {breed}
                </button>
              ))}
              {filteredBreeds.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No breeds found
                  <Button variant="link" size="sm" onClick={() => { update("breed", breedSearch); setStep("details"); }}>
                    Use "{breedSearch}" as custom breed
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === "details" && (
          <div className="space-y-4">
            {/* Photo */}
            <div className="flex justify-center">
              <label className="relative cursor-pointer">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Pet" className="h-24 w-24 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-secondary text-3xl">
                    {animalTypes.find(a => a.value === form.animal_type)?.emoji || "🐾"}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>

            <div className="space-y-2">
              <Label>Pet Name *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Buddy" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input value={form.age} onChange={(e) => update("age", e.target.value)} placeholder="2 years" />
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="10 kg" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="flex gap-2">
                {["Male", "Female"].map(g => (
                  <button
                    key={g}
                    onClick={() => update("gender", g)}
                    className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold transition-colors ${
                      form.gender === g ? "border-primary bg-primary/5 text-primary" : "border-border"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Vaccinated</Label>
              <Switch checked={form.vaccinated} onCheckedChange={(v) => update("vaccinated", v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Neutered / Spayed</Label>
              <Switch checked={form.neutered} onCheckedChange={(v) => update("neutered", v)} />
            </div>

            <div className="space-y-2">
              <Label>Temperament</Label>
              <div className="flex flex-wrap gap-2">
                {temperaments.map(t => (
                  <button
                    key={t}
                    onClick={() => update("temperament", t)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      form.temperament === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <Textarea value={form.medical_notes} onChange={(e) => update("medical_notes", e.target.value)} placeholder="Any medical conditions..." rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea value={form.special_care} onChange={(e) => update("special_care", e.target.value)} placeholder="Special care needs..." rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Emergency Contact</Label>
              <Input value={form.emergency_contact} onChange={(e) => update("emergency_contact", e.target.value)} placeholder="Name & phone" />
            </div>

            <div className="space-y-2">
              <Label>Veterinarian Info</Label>
              <Input value={form.vet_info} onChange={(e) => update("vet_info", e.target.value)} placeholder="Vet name & phone" />
            </div>

            <Button onClick={handleSave} className="w-full petkeep-gradient text-primary-foreground font-bold" disabled={saving}>
              {saving ? "Saving..." : (editPet ? "Update Pet" : "Add Pet")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPetFlow;
