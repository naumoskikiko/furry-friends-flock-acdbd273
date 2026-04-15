export const animalTypes = [
  { value: "dog", label: "Dog", emoji: "🐕" },
  { value: "cat", label: "Cat", emoji: "🐱" },
  { value: "bird", label: "Bird", emoji: "🐦" },
  { value: "fish", label: "Fish", emoji: "🐠" },
  { value: "rabbit", label: "Rabbit", emoji: "🐇" },
  { value: "hamster", label: "Hamster", emoji: "🐹" },
  { value: "guinea_pig", label: "Guinea Pig", emoji: "🐹" },
  { value: "turtle", label: "Turtle", emoji: "🐢" },
  { value: "snake", label: "Snake", emoji: "🐍" },
  { value: "lizard", label: "Lizard", emoji: "🦎" },
  { value: "ferret", label: "Ferret", emoji: "🦦" },
  { value: "hedgehog", label: "Hedgehog", emoji: "🦔" },
  { value: "horse", label: "Horse", emoji: "🐴" },
  { value: "parrot", label: "Parrot", emoji: "🦜" },
  { value: "other", label: "Other", emoji: "🐾" },
] as const;

export const breedsByAnimal: Record<string, string[]> = {
  dog: [
    "Labrador Retriever", "German Shepherd", "Golden Retriever", "Bulldog", "Poodle",
    "Beagle", "Rottweiler", "Yorkshire Terrier", "Boxer", "Dachshund",
    "Siberian Husky", "Doberman Pinscher", "Great Dane", "Shih Tzu", "Chihuahua",
    "Border Collie", "Australian Shepherd", "Cocker Spaniel", "Pug", "Maltese",
    "Akita", "Cane Corso", "Pit Bull Terrier", "Samoyed", "Saint Bernard",
    "Mixed Breed", "Other",
  ],
  cat: [
    "Persian", "Maine Coon", "Siamese", "Ragdoll", "British Shorthair",
    "Bengal", "Sphynx", "Scottish Fold", "Abyssinian", "Russian Blue",
    "Norwegian Forest Cat", "Savannah", "Birman", "Oriental Shorthair", "American Shorthair",
    "Mixed Breed", "Other",
  ],
  bird: [
    "Budgerigar (Budgie)", "Cockatiel", "Lovebird", "Canary", "Finch",
    "African Grey Parrot", "Macaw", "Amazon Parrot", "Cockatoo", "Parrotlet",
    "Conure", "Lorikeet", "Other",
  ],
  fish: [
    "Goldfish", "Betta (Siamese Fighting Fish)", "Guppy", "Molly", "Platy",
    "Angelfish", "Neon Tetra", "Discus", "Koi", "Cichlid",
    "Catfish (Pleco)", "Swordtail", "Other",
  ],
  rabbit: [
    "Holland Lop", "Mini Lop", "Netherland Dwarf", "Lionhead", "Flemish Giant",
    "Rex", "Mini Rex", "English Lop", "Dutch Rabbit", "Angora",
    "Californian", "Harlequin", "Other",
  ],
  hamster: [
    "Syrian Hamster", "Dwarf Campbell Hamster", "Winter White Hamster",
    "Roborovski Hamster", "Chinese Hamster", "Other",
  ],
  guinea_pig: [
    "American (Short Hair)", "Abyssinian", "Peruvian", "Silkie (Sheltie)",
    "Texel", "Rex", "Coronet", "Other",
  ],
  turtle: [
    "Red-Eared Slider", "Painted Turtle", "Box Turtle", "Snapping Turtle",
    "Musk Turtle", "Map Turtle", "Other",
  ],
  snake: [
    "Ball Python", "Corn Snake", "King Snake", "Milk Snake",
    "Boa Constrictor", "Garter Snake", "Other",
  ],
  lizard: [
    "Bearded Dragon", "Leopard Gecko", "Crested Gecko", "Iguana",
    "Monitor Lizard", "Chameleon", "Other",
  ],
  ferret: [
    "Standard Ferret", "Angora Ferret", "European Polecat (domestic)", "Other",
  ],
  hedgehog: [
    "African Pygmy Hedgehog", "Other",
  ],
  horse: [
    "Arabian", "Thoroughbred", "Quarter Horse", "Friesian", "Clydesdale",
    "Mustang", "Appaloosa", "Andalusian", "Other",
  ],
  parrot: [
    "Macaw", "Cockatoo", "African Grey", "Amazon Parrot", "Eclectus",
    "Quaker Parrot", "Conure", "Budgie", "Cockatiel", "Other",
  ],
  other: [
    "Mixed Breed", "Unknown", "Other",
  ],
};

export const temperaments = ["Friendly", "Aggressive", "Shy", "Energetic", "Calm", "Playful"] as const;
