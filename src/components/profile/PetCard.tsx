import { Pencil, Trash2 } from "lucide-react";
import { animalTypes } from "@/data/petBreeds";

interface PetCardProps {
  pet: any;
  onEdit: (pet: any) => void;
  onDelete: (petId: string) => void;
}

const PetCard = ({ pet, onEdit, onDelete }: PetCardProps) => {
  const emoji = animalTypes.find(a => a.value === pet.animal_type)?.emoji || "🐾";

  return (
    <div className="rounded-2xl bg-card p-3 petkeep-card-shadow petkeep-card-hover shrink-0 w-44">
      <div className="flex items-start justify-between">
        {pet.photo_url ? (
          <img src={pet.photo_url} alt={pet.name} className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-2xl">
            {emoji}
          </div>
        )}
        <div className="flex gap-1">
          <button onClick={() => onEdit(pet)} className="rounded-full p-1 hover:bg-secondary">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => onDelete(pet.id)} className="rounded-full p-1 hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-sm font-bold truncate">{pet.name}</p>
        <p className="text-xs text-muted-foreground truncate">{pet.breed || pet.animal_type}</p>
        {pet.age && <p className="text-[10px] text-muted-foreground">{pet.age}</p>}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {pet.vaccinated && <span className="rounded-full bg-petkeep-mint-light px-1.5 py-0.5 text-[9px] font-bold text-accent">✓ Vacc</span>}
        {pet.temperament && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold">{pet.temperament}</span>}
      </div>
    </div>
  );
};

export default PetCard;
