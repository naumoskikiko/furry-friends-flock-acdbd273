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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type PlaceInsert = Omit<Place, "id" | "created_at" | "updated_at">;

const CATEGORY_EMOJI: Record<string, string> = {
  vet: "🏥",
  "pet-shop": "🏪",
  park: "🌳",
  sitter: "🐾",
  grooming: "✂️",
  walker: "🐕‍🦺",
  other: "📍",
};

export const getCategoryEmoji = (category: string) =>
  CATEGORY_EMOJI[category] || "📍";

export const PLACE_CATEGORIES = [
  { value: "vet", label: "Veterinarian" },
  { value: "pet-shop", label: "Pet Shop" },
  { value: "park", label: "Dog Park" },
  { value: "sitter", label: "Pet Sitter" },
  { value: "grooming", label: "Grooming Salon" },
  { value: "walker", label: "Dog Walker" },
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
