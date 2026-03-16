import pet1 from "@/assets/pet1.jpg";
import pet2 from "@/assets/pet2.jpg";
import pet3 from "@/assets/pet3.jpg";
import pet4 from "@/assets/pet4.jpg";

export interface FeedPost {
  id: string;
  user: {
    name: string;
    avatar: string;
    verified: boolean;
    badge?: "student" | "sitter" | "store";
  };
  pet?: { name: string; breed: string };
  image: string;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
  liked: boolean;
  hashtags: string[];
}

export const mockPosts: FeedPost[] = [
  {
    id: "1",
    user: { name: "Ana Petrova", avatar: "AP", verified: true, badge: "sitter" },
    pet: { name: "Charlie", breed: "Golden Retriever" },
    image: pet1,
    caption: "Morning sunshine with my best buddy! ☀️🐕",
    likes: 142,
    comments: 23,
    timeAgo: "2h",
    liked: false,
    hashtags: ["SkopjeDogs", "GoldenRetriever", "PetKeep"],
  },
  {
    id: "2",
    user: { name: "Marko Iliev", avatar: "MI", verified: false },
    pet: { name: "Mika", breed: "Orange Tabby" },
    image: pet2,
    caption: "Cozy Sunday vibes with Mika 🧡",
    likes: 89,
    comments: 12,
    timeAgo: "4h",
    liked: true,
    hashtags: ["CatsOfSkopje", "CozyCat"],
  },
  {
    id: "3",
    user: { name: "Elena Stojanova", avatar: "ES", verified: true, badge: "student" },
    pet: { name: "Luna", breed: "Siberian Husky" },
    image: pet3,
    caption: "Luna loves the first snow! ❄️ Available for weekend walks 🐾",
    likes: 256,
    comments: 41,
    timeAgo: "6h",
    liked: false,
    hashtags: ["HuskyLove", "DogWalker", "StudentSitter"],
  },
  {
    id: "4",
    user: { name: "PetShop Plus", avatar: "PS", verified: true, badge: "store" },
    pet: { name: "Bruno", breed: "French Bulldog" },
    image: pet4,
    caption: "New bandana collection just dropped! 🎀 Visit us for 20% off this week.",
    likes: 67,
    comments: 8,
    timeAgo: "8h",
    liked: false,
    hashtags: ["PetFashion", "FrenchBulldog", "PetShop"],
  },
];

export interface Sitter {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  pricePerHour: number;
  distance: string;
  services: string[];
  verified: boolean;
  isStudent: boolean;
  bio: string;
}

export const mockSitters: Sitter[] = [
  {
    id: "1",
    name: "Ana Petrova",
    avatar: "AP",
    rating: 4.9,
    reviews: 47,
    pricePerHour: 300,
    distance: "1.2 km",
    services: ["Pet Sitting", "Pet Walking", "Drop-in Visits"],
    verified: true,
    isStudent: false,
    bio: "Experienced pet sitter with 3+ years of caring for dogs and cats.",
  },
  {
    id: "2",
    name: "Elena Stojanova",
    avatar: "ES",
    rating: 4.8,
    reviews: 23,
    pricePerHour: 200,
    distance: "0.8 km",
    services: ["Pet Walking", "Group Walks"],
    verified: true,
    isStudent: true,
    bio: "Veterinary student who loves animals! Flexible schedule.",
  },
  {
    id: "3",
    name: "Stefan Nikolov",
    avatar: "SN",
    rating: 4.7,
    reviews: 31,
    pricePerHour: 350,
    distance: "2.5 km",
    services: ["Pet Sitting", "Weekend Foster"],
    verified: true,
    isStudent: false,
    bio: "Dog trainer and pet sitter. Your pets are in safe hands!",
  },
  {
    id: "4",
    name: "Maja Dimitrova",
    avatar: "MD",
    rating: 5.0,
    reviews: 12,
    pricePerHour: 180,
    distance: "0.5 km",
    services: ["Dog Walking", "Drop-in Visits"],
    verified: false,
    isStudent: true,
    bio: "Animal science student looking to help pet owners nearby.",
  },
];

export interface StoreCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export const storeCategories: StoreCategory[] = [
  { id: "1", name: "Pet Food", icon: "🍖", count: 24 },
  { id: "2", name: "Accessories", icon: "🎀", count: 18 },
  { id: "3", name: "Toys", icon: "🧸", count: 31 },
  { id: "4", name: "Vet Clinics", icon: "🏥", count: 12 },
  { id: "5", name: "Grooming", icon: "✂️", count: 9 },
  { id: "6", name: "Training", icon: "🎓", count: 7 },
];
