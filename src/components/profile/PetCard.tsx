import { animalTypes } from "@/data/petBreeds";

interface PetCardProps {
  pet: any;
  onClick: (pet: any) => void;
}

const PetCard = ({ pet, onClick }: PetCardProps) => {
  const emoji = animalTypes.find(a => a.value === pet.animal_type)?.emoji || "🐾";

  return (
    <button onClick={() => onClick(pet)} className="flex flex-col items-center gap-1 shrink-0 w-16">
      {pet.photo_url ? (
        <img src={pet.photo_url} alt={pet.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-xl ring-2 ring-primary/20">
          {emoji}
        </div>
      )}
      <span className="text-[10px] font-semibold truncate w-full text-center">{pet.name}</span>
    </button>
  );
};

export default PetCard;
