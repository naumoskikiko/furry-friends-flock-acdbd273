import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { animalTypes } from "@/data/petBreeds";

interface PetProfileModalProps {
  pet: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner: boolean;
  onEdit: (pet: any) => void;
  onDelete: (petId: string) => void;
}

const PetProfileModal = ({ pet, open, onOpenChange, isOwner, onEdit, onDelete }: PetProfileModalProps) => {
  if (!pet) return null;
  const emoji = animalTypes.find(a => a.value === pet.animal_type)?.emoji || "🐾";

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-border last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Photo */}
        {pet.photo_url ? (
          <img src={pet.photo_url} alt={pet.name} className="w-full aspect-square object-cover" />
        ) : (
          <div className="w-full aspect-square bg-secondary flex items-center justify-center text-6xl">{emoji}</div>
        )}
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">{pet.name}</h2>
            {isOwner && (
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => { onOpenChange(false); onEdit(pet); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { onOpenChange(false); onDelete(pet.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {pet.vaccinated && <span className="rounded-full bg-petkeep-mint-light px-2 py-0.5 text-[10px] font-bold text-accent">✓ Vaccinated</span>}
            {pet.neutered && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">✓ Neutered</span>}
            {pet.temperament && <span className="rounded-full bg-petkeep-cream px-2 py-0.5 text-[10px] font-bold">{pet.temperament}</span>}
          </div>
          <div className="mt-3">
            <InfoRow label="Animal Type" value={pet.animal_type} />
            <InfoRow label="Breed" value={pet.breed} />
            <InfoRow label="Age" value={pet.age} />
            <InfoRow label="Gender" value={pet.gender} />
            <InfoRow label="Weight" value={pet.weight ? `${pet.weight} kg` : null} />
            <InfoRow label="Medical Notes" value={pet.medical_notes} />
            <InfoRow label="Special Care" value={pet.special_care} />
            <InfoRow label="Emergency Contact" value={pet.emergency_contact} />
            <InfoRow label="Vet Info" value={pet.vet_info} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PetProfileModal;
