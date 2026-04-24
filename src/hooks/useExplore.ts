import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MapMarker } from "@/components/explore/ExploreMap";
import type { NearbyItem } from "@/components/explore/NearbySection";
import { getCategoryEmoji } from "@/hooks/usePlaces";
import { cacheGet, cacheSet, CacheTTL } from "@/lib/cache";

const SKOPJE: [number, number] = [41.9981, 21.4254];

const CATEGORY_TYPE_MAP: Record<string, string> = {
  vet: "Vet Clinic",
  "pet-shop": "Pet Shop",
  park: "Park",
  sitter: "Pet Sitter",
  grooming: "Grooming Salon",
  walker: "Pet Walker",
  cafe: "Pet Friendly Cafe",
  "pet-service": "Pet Service",
  other: "Place",
};

const FILTERS = ["All", "Vets", "Stores", "Parks", "Cafes"] as const;
export type FilterType = (typeof FILTERS)[number];
export { FILTERS };

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useExplore() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [findMyPet, setFindMyPet] = useState(false);
  const [center, setCenter] = useState<[number, number]>(SKOPJE);
  const [dbPlaces, setDbPlaces] = useState<any[]>(() => cacheGet<any[]>("explore_places") || []);
  const [sitterProfiles, setSitterProfiles] = useState<any[]>(() => cacheGet<any[]>("explore_sitters") || []);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(!cacheGet<any[]>("explore_places"));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: places }, { data: sitters }, { data: profiles }] = await Promise.all([
        supabase.from("places").select("*"),
        supabase.from("sitter_profiles").select("*"),
        supabase.from("profiles").select("user_id, full_name, avatar_url, location, username"),
      ]);

      setDbPlaces(places || []);
      cacheSet("explore_places", places || [], CacheTTL.FEED);

      const sitterIds = (sitters || []).map((s: any) => s.user_id);
      let sitterProfileData: any[] = [];
      if (sitterIds.length > 0) {
        const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url, location").in("user_id", sitterIds);
        sitterProfileData = data || [];
      }

      const enrichedSitters = (sitters || []).map((s: any) => {
        const p = sitterProfileData.find((pr: any) => pr.user_id === s.user_id);
        return { ...s, profile: p };
      });
      setSitterProfiles(enrichedSitters);
      cacheSet("explore_sitters", enrichedSitters, CacheTTL.FEED);
      setUserProfiles(profiles || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    // Use a fresh, high-accuracy fix so the user's pin and distance calculations are correct.
    // Falls back silently to the Skopje default center on permission denial / failure.
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const placeMarkers: MapMarker[] = useMemo(
    () =>
      dbPlaces
        .filter((p: any) => {
          const lat = Number(p.latitude);
          const lng = Number(p.longitude);
          return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
        })
        .map((p: any) => {
          const lat = Number(p.latitude);
          const lng = Number(p.longitude);
          const dist = haversineDistance(center[0], center[1], lat, lng);
          return {
            id: p.id,
            lat,
            lng,
            name: p.name,
            type: CATEGORY_TYPE_MAP[p.category] || p.category,
            emoji: getCategoryEmoji(p.category),
            rating: Number(p.rating) || 0,
            distance: Number.isFinite(dist) ? `${dist.toFixed(1)} km` : "",
            image_url: p.image_url || undefined,
            description: p.description || undefined,
          };
        })
        .sort((a, b) => {
          const aDistance = Number.parseFloat(a.distance || "999999");
          const bDistance = Number.parseFloat(b.distance || "999999");
          return aDistance - bDistance;
        }),
    [dbPlaces, center]
  );

  // Sitters/Walkers are intentionally NOT plotted on the Explore map.
  // They don't store real coordinates on their profiles, and we never want
  // to fall back to randomized positions (would mislead users about who's nearby).
  const sitterMarkers: MapMarker[] = useMemo(() => [], []);

  const allMarkers = useMemo(() => {
    let markers = [...placeMarkers, ...sitterMarkers];

    if (activeFilter !== "All") {
      const filterMap: Record<string, string[]> = {
        Sitters: ["Pet Sitter"],
        Walkers: ["Pet Walker"],
        Vets: ["Vet Clinic"],
        Stores: ["Pet Shop"],
        Grooming: ["Grooming Salon"],
        Parks: ["Park"],
        Cafes: ["Pet Friendly Cafe"],
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
  }, [activeFilter, searchQuery, placeMarkers, sitterMarkers]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().replace(/^@/, "");
    const placeResults = placeMarkers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    ).map((p) => ({ ...p, avatar_url: null, username: null }));
    const userResults = userProfiles
      .filter((u: any) => 
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
      )
      .map((u: any) => ({
        id: u.user_id,
        name: u.full_name,
        type: "User",
        emoji: "👤",
        avatar_url: u.avatar_url,
        username: u.username,
      }));
    return [...userResults, ...placeResults].slice(0, 8);
  }, [searchQuery, placeMarkers, userProfiles]);

  const nearbyByCategory = useMemo(() => {
    const toNearby = (m: MapMarker): NearbyItem => ({
      id: m.id,
      name: m.name,
      type: m.type,
      distance: m.distance || "",
      rating: m.rating || 0,
      emoji: m.emoji,
    });
    return {
      stores: placeMarkers.filter((m) => m.type === "Pet Shop").map(toNearby),
      vets: placeMarkers.filter((m) => m.type === "Vet Clinic").map(toNearby),
      parks: placeMarkers.filter((m) => m.type === "Park").map(toNearby),
      grooming: placeMarkers.filter((m) => m.type === "Grooming Salon").map(toNearby),
      cafes: placeMarkers.filter((m) => m.type === "Pet Friendly Cafe").map(toNearby),
    };
  }, [placeMarkers]);

  const allNearbyItems = useMemo(() => {
    const toNearby = (m: MapMarker): NearbyItem => ({
      id: m.id,
      name: m.name,
      type: m.type,
      distance: m.distance || "",
      rating: m.rating || 0,
      emoji: m.emoji,
    });
    return placeMarkers.map(toNearby);
  }, [placeMarkers]);

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
    allNearbyItems,
    loading,
  };
}
