import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Place {
  id: string;
  name: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  website: string;
  rating: number;
  image_url: string;
  opening_hours: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type PlaceInsert = Omit<Place, "id" | "created_at" | "updated_at">;

const CATEGORY_EMOJI: Record<string, string> = {
  vet: "🏥",
  "pet-shop": "🐾",
  park: "🌳",
  sitter: "🐕",
  grooming: "✂️",
  walker: "🚶",
  cafe: "☕",
  hotel: "🏨",
  shelter: "🏠",
  trainer: "🎓",
  "vet-clinic": "🏥",
  "grooming-salon": "✂️",
  "pet-service": "🐕",
  other: "📍",
};

export const getCategoryEmoji = (category: string) =>
  CATEGORY_EMOJI[category] || "📍";

export const PLACE_CATEGORIES = [
  { value: "pet-shop", label: "Pet Shop" },
  { value: "vet", label: "Veterinarian" },
  { value: "grooming", label: "Groomer" },
  { value: "shelter", label: "Shelter" },
  { value: "trainer", label: "Pet Trainer" },
  { value: "boarding", label: "Pet Boarding" },
  { value: "walker", label: "Pet Walker" },
  { value: "sitter", label: "Pet Sitter" },
  { value: "park", label: "Pet Park" },
  { value: "cafe", label: "Pet Friendly Cafe" },
  { value: "hotel", label: "Pet Friendly Hotel" },
  { value: "pet-service", label: "Pet Service" },
  { value: "other", label: "Other" },
];

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("places")
      .select("*")
      .order("created_at", { ascending: false });
    setPlaces((data as Place[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const addPlace = async (place: PlaceInsert) => {
    const { error } = await supabase.from("places").insert(place as any);
    if (error) throw error;
    await fetchPlaces();
  };

  const updatePlace = async (id: string, updates: Partial<PlaceInsert>) => {
    const { error } = await supabase
      .from("places")
      .update(updates as any)
      .eq("id", id);
    if (error) throw error;
    await fetchPlaces();
  };

  const deletePlace = async (id: string) => {
    const { error } = await supabase.from("places").delete().eq("id", id);
    if (error) throw error;
    await fetchPlaces();
  };

  return { places, loading, fetchPlaces, addPlace, updatePlace, deletePlace };
}
