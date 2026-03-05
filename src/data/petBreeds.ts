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
    "Labrador Retriever", "Golden Retriever", "German Shepherd", "French Bulldog",
    "Bulldog", "Poodle", "Rottweiler", "Yorkshire Terrier", "Beagle", "Dachshund",
    "Siberian Husky", "Chihuahua", "Shih Tzu", "Border Collie", "Cocker Spaniel",
    "Doberman", "Mixed Breed", "Other",
  ],
  cat: [
    "Persian", "Maine Coon", "British Shorthair", "Siamese", "Ragdoll", "Sphynx",
    "Bengal", "Scottish Fold", "Abyssinian", "Russian Blue", "Mixed Breed", "Other",
  ],
  bird: ["Parakeet", "Cockatiel", "Parrot", "Canary", "Finch", "Macaw", "Other"],
  fish: ["Goldfish", "Betta", "Guppy", "Angelfish", "Cichlid", "Other"],
};

export const temperaments = ["Friendly", "Aggressive", "Shy", "Energetic", "Calm", "Playful"] as const;
