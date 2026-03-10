import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MapMarker } from "@/components/explore/ExploreMap";
import type { NearbyItem } from "@/components/explore/NearbySection";

const SKOPJE: [number, number] = [41.9981, 21.4254];

// Seed nearby places (static for now, can be DB-backed later)
const PLACES: (MapMarker & { category: string })[] = [
  { id: "p1", name: "Happy Paws Vet", type: "Vet Clinic", category: "vets", emoji: "🏥", lat: 41.9995, lng: 21.4280, rating: 4.8, distance: "0.3 km" },
  { id: "p2", name: "PetShop Plus", type: "Pet Store", category: "stores", emoji: "🏪", lat: 41.9970, lng: 21.4200, rating: 4.5, distance: "0.8 km" },
  { id: "p3", name: "City Dog Park", type: "Dog Park", category: "parks", emoji: "🌳", lat: 41.9960, lng: 21.4310, rating: 4.7, distance: "1.1 km" },
  { id: "p4", name: "Bark & Bath Grooming", type: "Grooming Salon", category: "grooming", emoji: "✂️", lat: 42.0010, lng: 21.4220, rating: 4.6, distance: "0.5 km" },
  { id: "p5", name: "PetWorld Store", type: "Pet Store", category: "stores", emoji: "🏪", lat: 41.9950, lng: 21.4270, rating: 4.3, distance: "1.4 km" },
  { id: "p6", name: "VetCare Clinic", type: "Vet Clinic", category: "vets", emoji: "🏥", lat: 42.0020, lng: 21.4180, rating: 4.9, distance: "1.0 km" },
  { id: "p7", name: "Riverside Pet Walk", type: "Dog Park", category: "parks", emoji: "🌳", lat: 41.9940, lng: 21.4350, rating: 4.4, distance: "1.6 km" },
  { id: "p8", name: "Paw Spa", type: "Grooming Salon", category: "grooming", emoji: "✂️", lat: 42.0005, lng: 21.4150, rating: 4.2, distance: "1.2 km" },
];

const FILTERS = ["All", "Sitters", "Walkers", "Vets", "Stores", "Grooming", "Parks", "Users"] as const;
export type FilterType = (typeof FILTERS)[number];
export { FILTERS };

export function useExplore() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [findMyPet, setFindMyPet] = useState(false);
  const [center] = useState<[number, number]>(SKOPJE);
  const [sitterProfiles, setSitterProfiles] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: sitters }, { data: profiles }] = await Promise.all([
        supabase.from("sitter_profiles").select("*"),
        supabase.from("profiles").select("user_id, full_name, avatar_url, location"),
      ]);

      // sitter_profiles doesn't have FK named that way, so fetch separately
      const sitterIds = (sitters || []).map((s) => s.user_id);
      let sitterProfileData: any[] = [];
      if (sitterIds.length > 0) {
        const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url, location").in("user_id", sitterIds);
        sitterProfileData = data || [];
      }

      setSitterProfiles(
        (sitters || []).map((s) => {
          const p = sitterProfileData.find((pr: any) => pr.user_id === s.user_id);
          return { ...s, profile: p };
        })
      );
      setUserProfiles(profiles || []);
      setLoading(false);
    };
    load();
  }, []);

  const sitterMarkers: MapMarker[] = useMemo(
    () =>
      sitterProfiles.map((s, i) => ({
        id: `sitter-${s.id}`,
        lat: SKOPJE[0] + (Math.random() - 0.5) * 0.01,
        lng: SKOPJE[1] + (Math.random() - 0.5) * 0.01,
        name: s.profile?.full_name || "Pet Sitter",
        type: (s.services || []).includes("walking") ? "Dog Walker" : "Pet Sitter",
        emoji: (s.services || []).includes("walking") ? "🐕‍🦺" : "🐾",
        rating: Number(s.avg_rating) || 0,
        distance: `${(0.2 + Math.random() * 2).toFixed(1)} km`,
      })),
    [sitterProfiles]
  );

  const allMarkers = useMemo(() => {
    let markers = [...PLACES.map((p) => ({ ...p })), ...sitterMarkers];

    if (activeFilter !== "All") {
      const filterMap: Record<string, string[]> = {
        Sitters: ["Pet Sitter"],
        Walkers: ["Dog Walker"],
        Vets: ["Vet Clinic"],
        Stores: ["Pet Store"],
        Grooming: ["Grooming Salon"],
        Parks: ["Dog Park"],
        Users: [],
      };
      const types = filterMap[activeFilter] || [];
      if (types.length > 0) {
        markers = markers.filter((m) => types.includes(m.type));
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      markers = markers.filter(
        (m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q)
      );
    }

    return markers;
  }, [activeFilter, searchQuery, sitterMarkers]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const placeResults = PLACES.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    );
    const userResults = userProfiles
      .filter((u) => u.full_name?.toLowerCase().includes(q))
      .map((u) => ({
        id: u.user_id,
        name: u.full_name,
        type: "User",
        emoji: "👤",
        avatar_url: u.avatar_url,
      }));
    return [...placeResults.map((p) => ({ ...p, avatar_url: null })), ...userResults].slice(0, 8);
  }, [searchQuery, userProfiles]);

  const nearbyByCategory = useMemo(() => {
    const toNearby = (p: typeof PLACES[0]): NearbyItem => ({
      id: p.id,
      name: p.name,
      type: p.type,
      distance: p.distance || "",
      rating: p.rating || 0,
      emoji: p.emoji,
    });
    return {
      stores: PLACES.filter((p) => p.category === "stores").map(toNearby),
      vets: PLACES.filter((p) => p.category === "vets").map(toNearby),
      parks: PLACES.filter((p) => p.category === "parks").map(toNearby),
      grooming: PLACES.filter((p) => p.category === "grooming").map(toNearby),
    };
  }, []);

  return {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    findMyPet,
    setFindMyPet,
    center,
    allMarkers,
    searchResults,
    nearbyByCategory,
    loading,
  };
}
